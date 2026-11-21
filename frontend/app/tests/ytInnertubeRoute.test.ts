import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/yt/[...path]/route';
import { stubFetch } from './fetchStub';

const KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
let restore: (() => void) | undefined;

afterEach(() => restore?.());

function call(path: string[], query = '') {
  const req = new NextRequest(`http://localhost:3000/api/yt/${path.join('/')}${query}`, {
    method: 'POST',
    body: JSON.stringify({ context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.0' } } }),
  });
  return POST(req, { params: Promise.resolve({ path }) });
}

describe('POST /api/yt/[...path]', () => {
  const rejected: string[][] = [
    ['..', '..', 'robots.txt'],
    ['../../robots.txt'],
    ['..%2F..%2Frobots.txt'],
    ['%2e%2e', 'robots.txt'],
    ['player?x=1'],
    ['player#frag'],
    ['player/../browse'],
  ];
  for (const path of rejected) {
    it(`rejects ${JSON.stringify(path)} with 400 and sends nothing upstream`, async () => {
      const stub = stubFetch(() => new Response('{}'));
      restore = stub.restore;
      const res = await call(path);
      assert.equal(res.status, 400);
      assert.equal(stub.calls.length, 0);
    });
  }

  it('proxies a plain endpoint to the InnerTube api with the default key', async () => {
    const stub = stubFetch(() => Response.json({ ok: true }));
    restore = stub.restore;
    const res = await call(['player']);
    assert.equal(res.status, 200);
    assert.equal(stub.calls[0].url, `https://www.youtube.com/youtubei/v1/player?key=${KEY}&prettyPrint=false`);
  });

  it('accepts nested endpoints and a leading youtubei/v1', async () => {
    const stub = stubFetch(() => Response.json({}));
    restore = stub.restore;
    await call(['music', 'get_search_suggestions']);
    await call(['youtubei', 'v1', 'browse']);
    assert.ok(stub.calls[0].url.startsWith('https://www.youtube.com/youtubei/v1/music/get_search_suggestions?'));
    assert.ok(stub.calls[1].url.startsWith('https://www.youtube.com/youtubei/v1/browse?'));
  });

  it('passes a well formed key through and rejects a malformed one', async () => {
    const stub = stubFetch(() => Response.json({}));
    restore = stub.restore;
    const customKey = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc';
    await call(['search'], `?key=${customKey}`);
    assert.ok(stub.calls[0].url.includes(`key=${customKey}`));

    const bad = await call(['search'], '?key=a%26b%3Dc');
    assert.equal(bad.status, 400);
    assert.equal(stub.calls.length, 1);
  });
});
