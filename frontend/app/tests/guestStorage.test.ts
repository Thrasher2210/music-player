import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeStorage, track } from './fakeBrowser';
import {
  addGuestPlaylistTracks,
  createGuestPlaylist,
  getGuestLikes,
  getGuestPlaylists,
  getGuestPlaylistTracks,
  isGuestPlaylistId,
  removeGuestLike,
  removeGuestPlaylist,
  removeGuestPlaylistTrack,
  saveGuestLike,
  setGuestPlaylistServerId,
} from '../src/stores/library/guestStorage';

describe('guestStorage', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installFakeStorage();
  });

  describe('likes', () => {
    it('saves a like once and removes it', () => {
      saveGuestLike(track('a'));
      saveGuestLike(track('a'));
      saveGuestLike(track('b'));
      assert.deepEqual(getGuestLikes().map((t) => t.videoId), ['b', 'a']);

      removeGuestLike('a');
      assert.deepEqual(getGuestLikes().map((t) => t.videoId), ['b']);
    });

    it('uses a single localStorage key', () => {
      saveGuestLike(track('a'));
      assert.deepEqual([...storage.keys()], ['mp_guest_likes']);
    });

    it('ignores corrupted storage instead of throwing', () => {
      storage.set('mp_guest_likes', '{"not":"an array"}');
      assert.deepEqual(getGuestLikes(), []);
      storage.set('mp_guest_likes', 'not json');
      assert.deepEqual(getGuestLikes(), []);
      saveGuestLike(track('a'));
      assert.deepEqual(getGuestLikes().map((t) => t.videoId), ['a']);
    });
  });

  describe('playlists', () => {
    it('creates guest playlists with a guest id and trackCount 0', () => {
      const pl = createGuestPlaylist('Road trip');
      assert.ok(isGuestPlaylistId(pl.id));
      assert.equal(pl.name, 'Road trip');
      assert.equal(getGuestPlaylists().length, 1);
      assert.equal(getGuestPlaylists()[0].trackCount, 0);
    });

    it('does not treat server uuids as guest ids', () => {
      assert.equal(isGuestPlaylistId('168777fa-2b81-4cf7-9df5-a1921377c19d'), false);
    });

    it('adds tracks without duplicates and derives trackCount', () => {
      const pl = createGuestPlaylist('Mix');
      assert.equal(addGuestPlaylistTracks(pl.id, [track('a'), track('b')]), 2);
      assert.equal(addGuestPlaylistTracks(pl.id, [track('b'), track('c'), track('c')]), 1);

      assert.deepEqual(getGuestPlaylistTracks(pl.id).map((t) => t.videoId), ['a', 'b', 'c']);
      assert.equal(getGuestPlaylists()[0].trackCount, 3);
    });

    it('returns null when adding to a playlist that does not exist', () => {
      assert.equal(addGuestPlaylistTracks('guest-missing', [track('a')]), null);
      assert.deepEqual(getGuestPlaylistTracks('guest-missing'), []);
    });

    it('removes a track and reports whether it was there', () => {
      const pl = createGuestPlaylist('Mix');
      addGuestPlaylistTracks(pl.id, [track('a'), track('b')]);

      assert.equal(removeGuestPlaylistTrack(pl.id, 'a'), true);
      assert.equal(removeGuestPlaylistTrack(pl.id, 'a'), false);
      assert.deepEqual(getGuestPlaylistTracks(pl.id).map((t) => t.videoId), ['b']);
      assert.equal(getGuestPlaylists()[0].trackCount, 1);
    });

    it('removes a playlist together with its tracks', () => {
      const keep = createGuestPlaylist('Keep');
      const drop = createGuestPlaylist('Drop');
      addGuestPlaylistTracks(keep.id, [track('a')]);
      addGuestPlaylistTracks(drop.id, [track('b')]);

      removeGuestPlaylist(drop.id);

      assert.deepEqual(getGuestPlaylists().map((p) => p.id), [keep.id]);
      assert.deepEqual(getGuestPlaylistTracks(drop.id), []);
      assert.deepEqual(getGuestPlaylistTracks(keep.id).map((t) => t.videoId), ['a']);
    });

    it('remembers the server id of a migrated playlist', () => {
      const pl = createGuestPlaylist('Mix');
      setGuestPlaylistServerId(pl.id, 'server-1');
      assert.equal(getGuestPlaylists()[0].serverId, 'server-1');
    });
  });
});
