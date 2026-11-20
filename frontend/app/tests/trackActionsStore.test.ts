import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '@mp/player-core';
import { useTrackActionsStore } from '../src/stores/trackActionsStore';

const track = (id: string): Track => ({
  id,
  videoId: id,
  title: `Song ${id}`,
  artist: 'Artist',
  duration: 180,
  thumbnail: '',
});

describe('trackActionsStore', () => {
  beforeEach(() => {
    useTrackActionsStore.getState().closeAddToPlaylist();
  });

  test('starts with no track waiting for a playlist', () => {
    assert.equal(useTrackActionsStore.getState().addToPlaylistTrack, null);
  });

  test('openAddToPlaylist stores the track and closeAddToPlaylist clears it', () => {
    const a = track('a');
    useTrackActionsStore.getState().openAddToPlaylist(a);
    assert.equal(useTrackActionsStore.getState().addToPlaylistTrack, a);

    useTrackActionsStore.getState().closeAddToPlaylist();
    assert.equal(useTrackActionsStore.getState().addToPlaylistTrack, null);
  });

  test('opening for another track replaces the pending one', () => {
    const { openAddToPlaylist } = useTrackActionsStore.getState();
    openAddToPlaylist(track('a'));
    openAddToPlaylist(track('b'));
    assert.equal(useTrackActionsStore.getState().addToPlaylistTrack?.videoId, 'b');
  });

  test('subscribers are notified when the picker opens and closes', () => {
    const seen: Array<string | null> = [];
    const unsubscribe = useTrackActionsStore.subscribe((state) => {
      seen.push(state.addToPlaylistTrack?.videoId ?? null);
    });

    useTrackActionsStore.getState().openAddToPlaylist(track('a'));
    useTrackActionsStore.getState().closeAddToPlaylist();
    unsubscribe();

    assert.deepEqual(seen, ['a', null]);
  });
});
