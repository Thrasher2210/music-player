import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '@mp/player-core';
import { createHistoryRecorder } from '../src/stores/player/historyRecorder';

const track = (videoId: string): Track => ({
  id: videoId,
  videoId,
  title: `Title ${videoId}`,
  artist: 'Artist',
  duration: 200,
  thumbnail: '',
});

function setup() {
  const recorded: Array<{ videoId: string; msPlayed: number }> = [];
  const recorder = createHistoryRecorder((t, msPlayed) => recorded.push({ videoId: t.videoId, msPlayed }));
  const play = (from: number, seconds: number) => {
    for (let t = from + 0.5; t <= from + seconds; t += 0.5) recorder.timeUpdate(t, 200);
  };
  return { recorded, recorder, play };
}

describe('history recorder', () => {
  it('records the current track once it has played long enough', () => {
    const { recorded, recorder, play } = setup();
    recorder.trackChange(track('a'));
    recorder.timeUpdate(0, 200);

    play(0, 29);
    assert.equal(recorded.length, 0);
    play(29, 5);
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].videoId, 'a');
    assert.ok(recorded[0].msPlayed >= 30000);
    play(34, 100);
    assert.equal(recorded.length, 1);
  });

  it('does not record a track that was skipped early', () => {
    const { recorded, recorder, play } = setup();
    recorder.trackChange(track('a'));
    recorder.timeUpdate(0, 200);
    play(0, 10);

    recorder.trackChange(track('b'));
    recorder.timeUpdate(0, 200);
    play(0, 31);

    assert.deepEqual(recorded.map((r) => r.videoId), ['b']);
  });

  it('is not confused by the repeated track change the engine emits while loading', () => {
    const { recorded, recorder, play } = setup();
    recorder.trackChange(track('a'));
    recorder.timeUpdate(0, 200);
    play(0, 20);
    recorder.trackChange(track('a'));
    play(20, 15);

    assert.equal(recorded.length, 1);
  });

  it('records the same track again after it ended and plays once more', () => {
    const { recorded, recorder, play } = setup();
    recorder.trackChange(track('a'));
    recorder.timeUpdate(0, 200);
    play(0, 31);
    recorder.ended();
    recorder.timeUpdate(0, 200);
    play(0, 31);

    assert.deepEqual(recorded.map((r) => r.videoId), ['a', 'a']);
  });

  it('ignores playback when there is no track', () => {
    const { recorded, recorder, play } = setup();
    recorder.trackChange(null);
    play(0, 60);
    assert.equal(recorded.length, 0);
  });
});
