import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '@mp/player-core';
import { recordPlayHistoryApi } from '../src/stores/library/libraryApi';

const realFetch = globalThis.fetch;

function stubFetch(respond: () => Response | Promise<Response>) {
  const bodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return respond();
  }) as typeof fetch;
  return bodies;
}

const track = (overrides: Partial<Track> = {}): Track => ({
  id: 'vid',
  videoId: 'vid',
  title: 'Song',
  artist: 'Artist',
  duration: 215.4,
  thumbnail: 'https://example.com/art.jpg',
  ...overrides,
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('recordPlayHistoryApi', () => {
  it('sends the track details with the play and returns the stored item', async () => {
    const bodies = stubFetch(() => new Response('{"ok":true}', { status: 201 }));

    const item = await recordPlayHistoryApi(track(), 31000);

    assert.deepEqual(bodies[0], {
      videoId: 'vid',
      msPlayed: 31000,
      title: 'Song',
      artist: 'Artist',
      albumArt: 'https://example.com/art.jpg',
      durationSec: 215,
    });
    assert.ok(item);
    assert.equal(item.videoId, 'vid');
    assert.equal(item.msPlayed, 31000);
    assert.equal(item.title, 'Song');
    assert.equal(item.durationSec, 215);
    assert.ok(!Number.isNaN(Date.parse(item.playedAt)));
  });

  it('leaves out details the track does not have', async () => {
    const bodies = stubFetch(() => new Response('{}', { status: 201 }));

    await recordPlayHistoryApi(track({ title: '', duration: 0, thumbnail: '' }), 5000);

    assert.deepEqual(bodies[0], { videoId: 'vid', msPlayed: 5000 });
  });

  it('keeps long text within what the API accepts', async () => {
    const bodies = stubFetch(() => new Response('{}', { status: 201 }));

    await recordPlayHistoryApi(track({ title: 'T'.repeat(900), artist: 'A'.repeat(900) }), 1000);

    assert.equal((bodies[0].title as string).length, 500);
    assert.equal((bodies[0].artist as string).length, 500);
  });

  it('returns null for guests and other rejected requests', async () => {
    stubFetch(() => new Response('{"error":"unauthorized"}', { status: 401 }));
    assert.equal(await recordPlayHistoryApi(track(), 1000), null);

    stubFetch(() => new Response('{}', { status: 400 }));
    assert.equal(await recordPlayHistoryApi(track(), 1000), null);
  });

  it('returns null instead of throwing when the network fails', async (t) => {
    t.mock.method(console, 'debug', () => {});
    stubFetch(() => {
      throw new TypeError('network down');
    });
    assert.equal(await recordPlayHistoryApi(track(), 1000), null);
  });
});
