import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/app/api/yt/stream/route';
import { bytes, headerOf, stubFetch } from './fetchStub';
import { HOST, streamRequest, within } from './streamRouteHelpers';

let restore: (() => void) | undefined;

afterEach(() => restore?.());

describe('GET /api/yt/stream does not buffer the body', () => {
  /** Upstream body that sends 3 bytes and then never ends. */
  function endlessUpstream(onCancel: () => void): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes(3));
      },
      cancel: onCancel,
    });
  }

  async function firstChunk(res: Response): Promise<number[]> {
    const reader = res.body!.getReader();
    const chunk = [...(await reader.read()).value!];
    await reader.cancel();
    return chunk;
  }

  it('streams a 206 as it arrives', async () => {
    let cancelled = false;
    const stub = stubFetch(
      () =>
        new Response(endlessUpstream(() => (cancelled = true)), {
          status: 206,
          headers: { 'content-range': 'bytes 0-29999999/30000000', 'content-length': '30000000' },
        })
    );
    restore = stub.restore;
    const res = await within(1000, GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=0-29999999' })));
    assert.deepEqual(await firstChunk(res), [0, 1, 2]);
    assert.equal(cancelled, true);
  });

  it('streams a sliced 200 as it arrives', async () => {
    const stub = stubFetch(
      () => new Response(endlessUpstream(() => {}), { status: 200, headers: { 'content-length': '30000000' } })
    );
    restore = stub.restore;
    const res = await within(1000, GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=0-29999999' })));
    assert.equal(res.status, 206);
    assert.deepEqual(await firstChunk(res), [0, 1, 2]);
  });

  it('streams a body of unknown length', async () => {
    const stub = stubFetch(() => new Response(endlessUpstream(() => {}), { status: 200 }));
    restore = stub.restore;
    const res = await within(1000, GET(streamRequest(`${HOST}?itag=251`)));
    assert.deepEqual(await firstChunk(res), [0, 1, 2]);
  });
});

describe('GET /api/yt/stream redirects and fallbacks', () => {
  it('follows a redirect to another googlevideo host', async () => {
    const stub = stubFetch((url) =>
      url.startsWith(HOST)
        ? new Response(null, { status: 302, headers: { location: 'https://rr2.googlevideo.com/videoplayback?x=1' } })
        : new Response(bytes(3), { status: 200, headers: { 'content-length': '3' } })
    );
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`));
    assert.equal(res.status, 200);
    assert.equal(stub.calls[1].url, 'https://rr2.googlevideo.com/videoplayback?x=1');
  });

  it('answers 403 instead of following a redirect off the allowlist', async () => {
    const stub = stubFetch((url) =>
      url.startsWith(HOST)
        ? new Response(null, { status: 302, headers: { location: 'https://www.youtube.com/robots.txt' } })
        : new Response('leaked')
    );
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`));
    assert.equal(res.status, 403);
    assert.equal(stub.calls.length, 1);
  });

  it('retries a CDN 403 with browser style headers', async () => {
    let attempt = 0;
    const stub = stubFetch(() =>
      ++attempt === 1
        ? new Response('no', { status: 403 })
        : new Response(bytes(2), { status: 200, headers: { 'content-length': '2' } })
    );
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251&c=IOS`));
    assert.equal(res.status, 200);
    assert.equal(headerOf(stub.calls[0].init, 'Origin'), undefined);
    assert.equal(headerOf(stub.calls[1].init, 'Origin'), 'https://www.youtube.com');
  });

  it('refreshes the url on a 403 range request using the requested itag only', async () => {
    const fresh = 'https://rr9.googlevideo.com/videoplayback?fresh=1';
    const stub = stubFetch((url) => {
      if (url.includes('youtubei/v1/player')) {
        return Response.json({ streamingData: { adaptiveFormats: [{ itag: 251, url: fresh }] } });
      }
      if (url === fresh) {
        return new Response(bytes(2), { status: 206, headers: { 'content-range': 'bytes 4-5/10' } });
      }
      return new Response('expired', { status: 403 });
    });
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=4-5', v: 'rollingAAAA' }));
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('content-range'), 'bytes 4-5/10');
    assert.equal(stub.calls.at(-1)?.url, fresh);
  });

  it('does not retry on another format when the itag is missing from the refresh', async () => {
    const other = 'https://rr9.googlevideo.com/videoplayback?other=1';
    const stub = stubFetch((url) =>
      url.includes('youtubei/v1/player')
        ? Response.json({ streamingData: { adaptiveFormats: [{ itag: 140, url: other }] } })
        : new Response('expired', { status: 403 })
    );
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=4-5', v: 'rollingBBBB' }));
    assert.equal(res.status, 403);
    assert.ok(!stub.calls.some((c) => c.url === other));
  });

  it('ignores a refreshed url that is not a googlevideo https url', async () => {
    const stub = stubFetch((url) =>
      url.includes('youtubei/v1/player')
        ? Response.json({ streamingData: { adaptiveFormats: [{ itag: 251, url: 'https://evil.com/x' }] } })
        : new Response('expired', { status: 403 })
    );
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=4-5', v: 'rollingCCCC' }));
    assert.equal(res.status, 403);
    assert.ok(!stub.calls.some((c) => c.url === 'https://evil.com/x'));
  });
});
