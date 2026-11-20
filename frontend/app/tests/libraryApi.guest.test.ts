import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeStorage, restoreFetch, stubFetch, track } from './fakeBrowser';
import {
  addTracksToPlaylistApi,
  createPlaylistApi,
  deletePlaylistApi,
  fetchPlaylistTracksApi,
  removeTrackFromPlaylistApi,
} from '../src/stores/library/libraryApi';
import { getGuestPlaylists } from '../src/stores/library/guestStorage';

describe('libraryApi playlists', () => {
  beforeEach(() => {
    installFakeStorage();
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('as a guest (server answers 401)', () => {
    it('can create a playlist, add, list and remove tracks, then delete it', async () => {
      const calls = stubFetch(() => ({ status: 401, json: { error: 'unauthorized' } }));

      const pl = await createPlaylistApi('Road trip');
      assert.ok(pl);
      assert.ok(pl.id.startsWith('guest-'));
      const requestsAfterCreate = calls.length;

      assert.equal(await addTracksToPlaylistApi(pl.id, [track('a'), track('b')]), 2);
      assert.equal(getGuestPlaylists()[0].trackCount, 2);
      assert.deepEqual((await fetchPlaylistTracksApi(pl.id)).map((t) => t.videoId), ['a', 'b']);

      assert.equal(await removeTrackFromPlaylistApi(pl.id, 'a'), true);
      assert.deepEqual((await fetchPlaylistTracksApi(pl.id)).map((t) => t.videoId), ['b']);

      assert.equal(await deletePlaylistApi(pl.id), true);
      assert.deepEqual(getGuestPlaylists(), []);
      assert.equal(calls.length, requestsAfterCreate, 'guest playlist operations stay local');
    });

    it('falls back to a guest playlist when the network is down', async () => {
      (globalThis as any).fetch = async () => {
        throw new TypeError('network down');
      };
      const pl = await createPlaylistApi('Offline');
      assert.ok(pl?.id.startsWith('guest-'));
    });

    it('rejects an empty name without creating anything', async () => {
      stubFetch(() => ({ status: 401 }));
      assert.equal(await createPlaylistApi('   '), null);
      assert.deepEqual(getGuestPlaylists(), []);
    });
  });

  describe('as a signed in user', () => {
    const serverId = '168777fa-2b81-4cf7-9df5-a1921377c19d';

    it('returns the number of tracks the server added', async () => {
      const calls = stubFetch(() => ({ status: 201, json: { added: 1 } }));
      assert.equal(await addTracksToPlaylistApi(serverId, [track('a'), track('b')]), 1);
      assert.equal(calls[0].url, `/api/playlists/${serverId}/tracks`);
      assert.equal(calls[0].body.tracks.length, 2);
    });

    it('falls back to the sent count when the server does not report one', async () => {
      stubFetch(() => ({ status: 201, json: {} }));
      assert.equal(await addTracksToPlaylistApi(serverId, [track('a'), track('b')]), 2);
    });

    it('returns null when the request fails', async () => {
      stubFetch(() => ({ status: 500 }));
      assert.equal(await addTracksToPlaylistApi(serverId, [track('a')]), null);
    });

    it('returns null without calling the server when no tracks are given', async () => {
      const calls = stubFetch(() => ({ status: 201 }));
      assert.equal(await addTracksToPlaylistApi(serverId, []), null);
      assert.equal(calls.length, 0);
    });

    it('reads, removes and deletes through the API for server ids', async () => {
      const calls = stubFetch((call) =>
        call.method === 'GET'
          ? { status: 200, json: { tracks: [{ videoId: 'a', title: 'A', artist: 'X', durationMs: 90000, albumArt: null }] } }
          : { status: 200, json: { ok: true } }
      );

      const tracks = await fetchPlaylistTracksApi(serverId);
      assert.deepEqual(tracks.map((t) => [t.videoId, t.duration]), [['a', 90]]);
      assert.equal(await removeTrackFromPlaylistApi(serverId, 'a'), true);
      assert.equal(await deletePlaylistApi(serverId), true);
      assert.deepEqual(
        calls.map((c) => `${c.method} ${c.url}`),
        [
          `GET /api/playlists/${serverId}/tracks`,
          `DELETE /api/playlists/${serverId}/tracks/a`,
          `DELETE /api/playlists/${serverId}`,
        ]
      );
    });
  });
});
