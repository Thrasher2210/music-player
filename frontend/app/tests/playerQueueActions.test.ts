import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '@mp/player-core';
import { createQueueSlice } from '../src/stores/player/queueSlice';
import { toTrackData, type PlayerStoreState } from '../src/stores/player/types';

const track = (id: string): Track => ({
  id,
  videoId: id,
  title: `Song ${id}`,
  artist: 'Artist',
  duration: 200,
  thumbnail: 'https://example.com/t.jpg',
});

type SetQueueCall = { tracks: Track[]; startIndex?: number; autoPlay?: boolean };

function makeSlice(queue: Track[], currentIndex: number) {
  const setQueueCalls: SetQueueCall[] = [];
  const addToQueueCalls: Track[] = [];
  const state = {
    queue,
    currentIndex,
    engine: null,
    setQueue: (tracks: Track[], startIndex?: number, autoPlay?: boolean) => {
      setQueueCalls.push({ tracks, startIndex, autoPlay });
    },
    addToQueue: (t: Track) => {
      addToQueueCalls.push(t);
    },
  } as unknown as PlayerStoreState;
  const slice = createQueueSlice(() => undefined, () => state);
  return { slice, setQueueCalls, addToQueueCalls };
}

describe('player store playNext', () => {
  test('inserts the track right after the current one without interrupting playback', () => {
    const { slice, setQueueCalls, addToQueueCalls } = makeSlice(
      [track('a'), track('b'), track('c')],
      1
    );
    slice.playNext(track('x'));

    assert.equal(addToQueueCalls.length, 0);
    assert.equal(setQueueCalls.length, 1);
    assert.deepEqual(
      setQueueCalls[0].tracks.map((t) => t.videoId),
      ['a', 'b', 'x', 'c']
    );
    assert.equal(setQueueCalls[0].startIndex, 1, 'current index stays on the playing track');
    assert.equal(setQueueCalls[0].autoPlay, false);
  });

  test('inserts after the last track when the current one is last', () => {
    const { slice, setQueueCalls } = makeSlice([track('a'), track('b')], 1);
    slice.playNext(track('x'));
    assert.deepEqual(
      setQueueCalls[0].tracks.map((t) => t.videoId),
      ['a', 'b', 'x']
    );
  });

  test('does not mutate the existing queue array', () => {
    const queue = [track('a'), track('b')];
    const { slice } = makeSlice(queue, 0);
    slice.playNext(track('x'));
    assert.deepEqual(
      queue.map((t) => t.videoId),
      ['a', 'b']
    );
  });

  test('falls back to adding to the queue when nothing is current', () => {
    const empty = makeSlice([], -1);
    empty.slice.playNext(track('x'));
    assert.equal(empty.setQueueCalls.length, 0);
    assert.deepEqual(
      empty.addToQueueCalls.map((t) => t.videoId),
      ['x']
    );

    const noCurrent = makeSlice([track('a')], -1);
    noCurrent.slice.playNext(track('y'));
    assert.deepEqual(
      noCurrent.addToQueueCalls.map((t) => t.videoId),
      ['y']
    );
  });
});

describe('toTrackData', () => {
  test('carries the liked state when given', () => {
    assert.equal(toTrackData(track('a'), true).isLiked, true);
    assert.equal(toTrackData(track('a'), false).isLiked, false);
  });

  test('leaves isLiked unset when not given', () => {
    assert.equal(toTrackData(track('a')).isLiked, undefined);
  });

  test('maps the track fields rows render', () => {
    const data = toTrackData(track('a'));
    assert.equal(data.id, 'a');
    assert.equal(data.title, 'Song a');
    assert.equal(data.thumbnailUrl, 'https://example.com/t.jpg');
    assert.equal(data.duration, 200);
  });
});
