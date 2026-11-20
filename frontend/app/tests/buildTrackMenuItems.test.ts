import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '@mp/player-core';
import {
  buildTrackMenuItems,
  type TrackMenuActions,
} from '../src/components/track-menu/buildTrackMenuItems';
import { isLibraryPlaylistId } from '../src/components/track-menu/isLibraryPlaylistId';

const track: Track = {
  id: 'vid1',
  videoId: 'vid1',
  title: 'Song One',
  artist: 'Artist A',
  duration: 180,
  thumbnail: '',
};

function recordingActions(withRemove = false) {
  const calls: Array<[string, string]> = [];
  const record = (name: string) => (t: Track) => {
    calls.push([name, t.videoId]);
  };
  const actions: TrackMenuActions = {
    playNext: record('playNext'),
    addToQueue: record('addToQueue'),
    addToPlaylist: record('addToPlaylist'),
    toggleLike: record('toggleLike'),
    ...(withRemove ? { removeFromPlaylist: record('removeFromPlaylist') } : {}),
  };
  return { actions, calls };
}

describe('buildTrackMenuItems', () => {
  test('lists the standard actions in order', () => {
    const { actions } = recordingActions();
    const items = buildTrackMenuItems(track, false, actions);
    assert.deepEqual(
      items.map((i) => i.id),
      ['play-next', 'add-to-queue', 'add-to-playlist', 'toggle-like']
    );
    assert.deepEqual(
      items.map((i) => i.label),
      ['Play next', 'Add to queue', 'Add to playlist', 'Like']
    );
  });

  test('labels the like action by the current like state', () => {
    const { actions } = recordingActions();
    const liked = buildTrackMenuItems(track, true, actions).find((i) => i.id === 'toggle-like');
    const notLiked = buildTrackMenuItems(track, false, actions).find((i) => i.id === 'toggle-like');
    assert.equal(liked?.label, 'Unlike');
    assert.equal(notLiked?.label, 'Like');
  });

  test('offers removal only when a removeFromPlaylist action is provided', () => {
    const without = buildTrackMenuItems(track, false, recordingActions().actions);
    assert.ok(!without.some((i) => i.id === 'remove-from-playlist'));

    const withRemove = buildTrackMenuItems(track, false, recordingActions(true).actions);
    const last = withRemove[withRemove.length - 1];
    assert.equal(last.id, 'remove-from-playlist');
    assert.equal(last.destructive, true);
    assert.equal(last.label, 'Remove from this playlist');
  });

  test('only the removal item is destructive', () => {
    const items = buildTrackMenuItems(track, false, recordingActions(true).actions);
    assert.deepEqual(
      items.filter((i) => i.destructive).map((i) => i.id),
      ['remove-from-playlist']
    );
  });

  test('each item calls its action with the track', () => {
    const { actions, calls } = recordingActions(true);
    for (const item of buildTrackMenuItems(track, false, actions)) {
      item.onSelect();
    }
    assert.deepEqual(calls, [
      ['playNext', 'vid1'],
      ['addToQueue', 'vid1'],
      ['addToPlaylist', 'vid1'],
      ['toggleLike', 'vid1'],
      ['removeFromPlaylist', 'vid1'],
    ]);
  });
});

describe('isLibraryPlaylistId', () => {
  test('accepts library playlist uuids', () => {
    assert.equal(isLibraryPlaylistId('168777fa-2b81-4cf7-9df5-a1921377c19d'), true);
    assert.equal(isLibraryPlaylistId('168777FA-2B81-4CF7-9DF5-A1921377C19D'), true);
  });

  test('rejects liked music and remote YouTube Music ids', () => {
    for (const id of ['liked', 'LM', 'VLPLabc123', 'PLabc123', 'RDCLAK5uy_x', '', 'not-a-uuid']) {
      assert.equal(isLibraryPlaylistId(id), false, id);
    }
  });
});
