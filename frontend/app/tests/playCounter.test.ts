import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlayCounter } from '../src/stores/player/playCounter';

/** Plays `seconds` of audio from `from` in quarter second steps and returns the first counted play. */
function listen(counter: PlayCounter, from: number, seconds: number, duration: number): number | null {
  for (let t = from + 0.25; t <= from + seconds + 1e-9; t += 0.25) {
    const counted = counter.tick(t, duration);
    if (counted !== null) return counted;
  }
  return null;
}

describe('PlayCounter', () => {
  it('counts a play after 30 seconds of a long track', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 240);

    assert.equal(listen(counter, 0, 29, 240), null);
    const msPlayed = listen(counter, 29, 2, 240);
    assert.ok(msPlayed !== null);
    assert.ok(msPlayed >= 30000 && msPlayed <= 30250, `msPlayed ${msPlayed}`);
  });

  it('counts a play at half of a short track', () => {
    const counter = new PlayCounter();
    counter.load('short');
    counter.tick(0, 40);

    assert.equal(listen(counter, 0, 19, 40), null);
    const msPlayed = listen(counter, 19, 2, 40);
    assert.ok(msPlayed !== null);
    assert.ok(msPlayed >= 20000 && msPlayed <= 20250, `msPlayed ${msPlayed}`);
  });

  it('falls back to 30 seconds while the duration is still unknown', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 0);

    assert.equal(listen(counter, 0, 29, 0), null);
    assert.ok(listen(counter, 29, 2, 0) !== null);
  });

  it('reports a play once per load', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 240);
    assert.ok(listen(counter, 0, 31, 240) !== null);

    assert.equal(listen(counter, 31, 60, 240), null);
  });

  it('does not count seeking as playback', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 240);
    assert.equal(listen(counter, 0, 10, 240), null);

    assert.equal(counter.tick(200, 240), null);
    assert.equal(counter.tick(100, 240), null);
    assert.equal(counter.tick(5, 240), null);
    assert.equal(counter.tick(180, 240), null);
  });

  it('keeps counting from the new position after a seek', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 240);
    listen(counter, 0, 20, 240);
    counter.tick(150, 240);

    assert.ok(listen(counter, 150, 11, 240) !== null);
  });

  it('ignores pauses and a track that starts mid way', () => {
    const counter = new PlayCounter();
    counter.load('a');
    assert.equal(counter.tick(90, 240), null);
    assert.equal(listen(counter, 90, 29, 240), null);
    assert.ok(listen(counter, 119, 2, 240) !== null);
  });

  it('starts over when a different track loads', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 240);
    listen(counter, 0, 20, 240);

    counter.load('b');
    counter.tick(0, 240);
    assert.equal(listen(counter, 0, 20, 240), null);
    assert.ok(listen(counter, 20, 11, 240) !== null);
  });

  it('keeps counting when the same track is loaded again while it plays', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 240);
    listen(counter, 0, 20, 240);

    counter.load('a');
    assert.ok(listen(counter, 20, 11, 240) !== null);
  });

  it('counts a replay of the same track after it ended', () => {
    const counter = new PlayCounter();
    counter.load('a');
    counter.tick(0, 60);
    assert.ok(listen(counter, 0, 31, 60) !== null);

    counter.replay();
    counter.tick(0, 60);
    assert.equal(listen(counter, 0, 20, 60), null);
    assert.ok(listen(counter, 20, 11, 60) !== null);
  });

  it('ignores ticks while no track is loaded', () => {
    const counter = new PlayCounter();
    assert.equal(listen(counter, 0, 60, 240), null);
    counter.load(null);
    assert.equal(listen(counter, 0, 60, 240), null);
  });
});
