import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeStorage, restoreFetch, stubFetch, track, type FetchCall } from './fakeBrowser';
import {
  addGuestPlaylistTracks,
  createGuestPlaylist,
  getGuestLikes,
  getGuestPlaylists,
  getGuestPlaylistTracks,
  saveGuestLike,
} from '../src/stores/library/guestStorage';
import { migrateGuestData } from '../src/stores/library/guestMigration';

const isLikePut = (c: FetchCall) => c.method === 'PUT' && c.url.startsWith('/api/likes/');

describe('migrateGuestData', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installFakeStorage();
  });

  afterEach(() => {
    restoreFetch();
  });

  it('uploads likes and clears them from localStorage', async () => {
    saveGuestLike(track('a', { thumbnail: 'http://img/a.jpg' }));
    saveGuestLike(track('b'));
    const calls = stubFetch(() => ({ status: 200, json: { ok: true } }));

    const result = await migrateGuestData();

    assert.deepEqual(result, { likes: 2, playlists: 0 });
    assert.deepEqual(getGuestLikes(), []);
    assert.deepEqual(calls.map((c) => c.url).sort(), ['/api/likes/a', '/api/likes/b']);
    const first = calls.find((c) => c.url === '/api/likes/a');
    assert.deepEqual(first?.body, { title: 'Title a', artist: 'Artist a', albumArt: 'http://img/a.jpg' });
  });

  it('keeps only the likes the server rejected', async () => {
    saveGuestLike(track('a'));
    saveGuestLike(track('b'));
    saveGuestLike(track('c'));
    stubFetch((call) => ({ status: call.url.endsWith('/b') ? 429 : 200 }));

    const result = await migrateGuestData();

    assert.equal(result.likes, 2);
    assert.deepEqual(getGuestLikes().map((t) => t.videoId), ['b']);
  });

  it('keeps likes when the network fails', async () => {
    saveGuestLike(track('a'));
    (globalThis as any).fetch = async () => {
      throw new TypeError('network down');
    };

    const result = await migrateGuestData();

    assert.equal(result.likes, 0);
    assert.deepEqual(getGuestLikes().map((t) => t.videoId), ['a']);
  });

  it('creates guest playlists on the server with their tracks and clears them', async () => {
    const pl = createGuestPlaylist('Road trip');
    addGuestPlaylistTracks(pl.id, [track('a'), track('b')]);
    const empty = createGuestPlaylist('Empty');
    const calls = stubFetch((call) => {
      if (call.url === '/api/playlists') return { status: 201, json: { playlist: { id: `srv-${call.body.name}` } } };
      return { status: 201, json: { added: call.body.tracks.length } };
    });

    const result = await migrateGuestData();

    assert.deepEqual(result, { likes: 0, playlists: 2 });
    assert.deepEqual(getGuestPlaylists(), []);
    assert.deepEqual(getGuestPlaylistTracks(pl.id), []);
    const trackUpload = calls.find((c) => c.url === '/api/playlists/srv-Road%20trip/tracks');
    assert.deepEqual(trackUpload?.body.tracks.map((t: any) => t.videoId), ['a', 'b']);
    assert.ok(!calls.some((c) => c.url.includes(`srv-Empty`)), 'empty playlist uploads no tracks');
    assert.ok(empty.id);
  });

  it('keeps a playlist whose creation failed', async () => {
    const pl = createGuestPlaylist('Road trip');
    addGuestPlaylistTracks(pl.id, [track('a')]);
    stubFetch(() => ({ status: 500 }));

    const result = await migrateGuestData();

    assert.equal(result.playlists, 0);
    assert.equal(getGuestPlaylists().length, 1);
    assert.equal(getGuestPlaylistTracks(pl.id).length, 1);
  });

  it('does not create a second server playlist when only the track upload failed before', async () => {
    const pl = createGuestPlaylist('Road trip');
    addGuestPlaylistTracks(pl.id, [track('a')]);
    let failTracks = true;
    const calls = stubFetch((call) => {
      if (call.url === '/api/playlists') return { status: 201, json: { playlist: { id: 'srv-1' } } };
      return failTracks ? { status: 500 } : { status: 201, json: { added: 1 } };
    });

    assert.equal((await migrateGuestData()).playlists, 0);
    assert.equal(getGuestPlaylists().length, 1);

    failTracks = false;
    assert.equal((await migrateGuestData()).playlists, 1);

    assert.equal(calls.filter((c) => c.method === 'POST' && c.url === '/api/playlists').length, 1);
    assert.equal(calls.filter((c) => c.url === '/api/playlists/srv-1/tracks').length, 2);
    assert.deepEqual(getGuestPlaylists(), []);
  });

  it('shares one run between concurrent calls', async () => {
    saveGuestLike(track('a'));
    saveGuestLike(track('b'));
    const calls = stubFetch(() => ({ status: 200 }));

    const [first, second] = await Promise.all([migrateGuestData(), migrateGuestData()]);

    assert.equal(first, second);
    assert.equal(calls.filter(isLikePut).length, 2);
  });

  it('is idempotent and makes no requests when there is nothing to migrate', async () => {
    saveGuestLike(track('a'));
    const calls = stubFetch(() => ({ status: 200 }));

    await migrateGuestData();
    const again = await migrateGuestData();

    assert.deepEqual(again, { likes: 0, playlists: 0 });
    assert.equal(calls.length, 1);
    assert.deepEqual([...storage.keys()].filter((k) => k.startsWith('ganegan_')), []);
  });
});
