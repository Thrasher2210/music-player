import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchFollowingRedirects, UpstreamError } from '../src/lib/yt-proxy/upstreamFetch';
import { stubFetch } from './fetchStub';

const START = 'https://rr1.googlevideo.com/videoplayback?id=1';
let restore: (() => void) | undefined;

afterEach(() => restore?.());

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

describe('fetchFollowingRedirects', () => {
  it('never lets fetch follow redirects on its own', async () => {
    const stub = stubFetch(() => new Response('ok'));
    restore = stub.restore;
    await fetchFollowingRedirects(START, { method: 'GET' });
    assert.equal(stub.calls[0].init.redirect, 'manual');
  });

  it('follows redirects between googlevideo hosts', async () => {
    const stub = stubFetch((url) =>
      url === START ? redirect('https://rr2.googlevideo.com/videoplayback?id=1') : new Response('done')
    );
    restore = stub.restore;
    const res = await fetchFollowingRedirects(START, { method: 'GET' });
    assert.equal(await res.text(), 'done');
    assert.deepEqual(
      stub.calls.map((c) => c.url),
      [START, 'https://rr2.googlevideo.com/videoplayback?id=1']
    );
  });

  it('resolves relative Location headers against the current hop', async () => {
    const stub = stubFetch((url) =>
      url === START ? redirect('/videoplayback?id=2', 307) : new Response('done')
    );
    restore = stub.restore;
    await fetchFollowingRedirects(START, { method: 'GET' });
    assert.equal(stub.calls[1].url, 'https://rr1.googlevideo.com/videoplayback?id=2');
  });

  for (const target of [
    'https://www.youtube.com/robots.txt',
    'https://evil.com/x',
    'http://rr2.googlevideo.com/x',
    'https://169.254.169.254/latest/meta-data',
  ]) {
    it(`blocks a redirect to ${target}`, async () => {
      const stub = stubFetch((url) => (url === START ? redirect(target) : new Response('leaked')));
      restore = stub.restore;
      await assert.rejects(
        fetchFollowingRedirects(START, { method: 'GET' }),
        (err: unknown) => err instanceof UpstreamError && err.status === 403
      );
      assert.equal(stub.calls.length, 1);
    });
  }

  it('re-validates every hop, not just the first', async () => {
    const stub = stubFetch((url) =>
      url === START ? redirect('https://rr2.googlevideo.com/a') : redirect('https://evil.com/b')
    );
    restore = stub.restore;
    await assert.rejects(
      fetchFollowingRedirects(START, { method: 'GET' }),
      (err: unknown) => err instanceof UpstreamError && err.status === 403
    );
    assert.equal(stub.calls.length, 2);
  });

  it('gives up after 5 redirects', async () => {
    const stub = stubFetch(() => redirect('https://rr1.googlevideo.com/loop'));
    restore = stub.restore;
    await assert.rejects(
      fetchFollowingRedirects(START, { method: 'GET' }),
      (err: unknown) => err instanceof UpstreamError && err.status === 502
    );
    assert.equal(stub.calls.length, 6);
  });

  it('returns a redirect without Location as is', async () => {
    const stub = stubFetch(() => new Response(null, { status: 302 }));
    restore = stub.restore;
    const res = await fetchFollowingRedirects(START, { method: 'GET' });
    assert.equal(res.status, 302);
  });
});
