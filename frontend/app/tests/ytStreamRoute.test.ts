import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, HEAD } from '../src/app/api/yt/stream/route';
import { bytes, headerOf, stubFetch } from './fetchStub';
import { BASE, body, HOST, streamRequest } from './streamRouteHelpers';

let restore: (() => void) | undefined;

afterEach(() => restore?.());

describe('GET /api/yt/stream target validation', () => {
  const cases: Array<[string, string, number]> = [
    ['unparseable url', 'notaurl', 400],
    ['non google host', 'https://evil.com/videoplayback', 403],
    ['youtube page', 'https://www.youtube.com/robots.txt', 403],
    ['lookalike host', 'https://googlevideo.com.evil.com/x', 403],
    ['plain http', 'http://rr1.googlevideo.com/videoplayback', 403],
    ['file scheme', 'file:///etc/passwd', 403],
  ];
  for (const [name, target, status] of cases) {
    it(`${name} gets ${status} and never reaches upstream`, async () => {
      const stub = stubFetch(() => new Response('leaked'));
      restore = stub.restore;
      const res = await GET(streamRequest(target));
      assert.equal(res.status, status);
      assert.equal(stub.calls.length, 0);
    });
  }

  it('answers 400 when the url parameter is missing', async () => {
    const res = await GET(new NextRequest(BASE));
    assert.equal(res.status, 400);
  });
});

describe('GET /api/yt/stream range handling', () => {
  it('passes a 206 through with its Content-Range', async () => {
    const stub = stubFetch(
      () =>
        new Response(bytes(4), {
          status: 206,
          headers: { 'content-type': 'audio/webm', 'content-range': 'bytes 0-3/100', 'content-length': '4' },
        })
    );
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=0-3' }));
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('content-range'), 'bytes 0-3/100');
    assert.deepEqual(await body(res), [0, 1, 2, 3]);
    assert.equal(headerOf(stub.calls[0].init, 'Range'), 'bytes=0-3');
    assert.equal(stub.calls[0].init.method, 'GET');
  });

  const full = () =>
    new Response(bytes(10), { status: 200, headers: { 'content-length': '10', 'content-type': 'audio/webm' } });

  const slices: Array<[string, string, string, number[]]> = [
    ['bounded', 'bytes=2-5', 'bytes 2-5/10', [2, 3, 4, 5]],
    ['open ended', 'bytes=7-', 'bytes 7-9/10', [7, 8, 9]],
    ['suffix', 'bytes=-3', 'bytes 7-9/10', [7, 8, 9]],
    ['past the end', 'bytes=8-99', 'bytes 8-9/10', [8, 9]],
  ];
  for (const [name, range, contentRange, expected] of slices) {
    it(`slices a 200 reply to a ${name} range into a 206 with Content-Range`, async () => {
      const stub = stubFetch(full);
      restore = stub.restore;
      const res = await GET(streamRequest(`${HOST}?itag=251`, { range }));
      assert.equal(res.status, 206);
      assert.equal(res.headers.get('content-range'), contentRange);
      assert.deepEqual(await body(res), expected);
    });
  }

  it('answers 416 with the total size for an unsatisfiable range', async () => {
    const stub = stubFetch(full);
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=50-' }));
    assert.equal(res.status, 416);
    assert.equal(res.headers.get('content-range'), 'bytes */10');
  });

  it('never labels a reply 206 without Content-Range', async () => {
    const stub = stubFetch(() => new Response(bytes(10), { status: 200 }));
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`, { range: 'bytes=2-5' }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-range'), null);
    assert.deepEqual(await body(res), [...bytes(10)]);
  });

  it('returns a plain GET in full', async () => {
    const stub = stubFetch(full);
    restore = stub.restore;
    const res = await GET(streamRequest(`${HOST}?itag=251`));
    assert.equal(res.status, 200);
    assert.deepEqual(await body(res), [...bytes(10)]);
  });
});

describe('HEAD /api/yt/stream', () => {
  it('sends a HEAD upstream and returns headers without a body', async () => {
    const stub = stubFetch(() => new Response(null, { status: 200, headers: { 'content-type': 'audio/webm' } }));
    restore = stub.restore;
    const res = await HEAD(streamRequest(`${HOST}?itag=251`, { method: 'HEAD' }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'audio/webm');
    assert.equal(stub.calls.length, 1);
    assert.equal(stub.calls[0].init.method, 'HEAD');
    assert.equal((await res.arrayBuffer()).byteLength, 0);
  });

  for (const rejection of [403, 405, 501]) {
    it(`falls back to a one byte range probe when upstream answers HEAD with ${rejection}`, async () => {
      const stub = stubFetch((_url, init) =>
        init.method === 'HEAD'
          ? new Response(null, { status: rejection })
          : new Response(bytes(1), {
              status: 206,
              headers: { 'content-range': 'bytes 0-0/1234', 'content-type': 'audio/mp4' },
            })
      );
      restore = stub.restore;
      const res = await HEAD(streamRequest(`${HOST}?itag=140`, { method: 'HEAD' }));
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'audio/mp4');
      assert.deepEqual(
        stub.calls.map((c) => [c.init.method, headerOf(c.init, 'Range')]),
        [
          ['HEAD', undefined],
          ['GET', 'bytes=0-0'],
        ]
      );
    });
  }

  it('reports the probe failure when the url really is rejected', async () => {
    const stub = stubFetch(() => new Response(null, { status: 403 }));
    restore = stub.restore;
    const res = await HEAD(streamRequest(`${HOST}?itag=140`, { method: 'HEAD' }));
    assert.equal(res.status, 403);
  });
});
