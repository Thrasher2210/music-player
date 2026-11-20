import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PlayerEngine, Track, NetworkAdapter } from '../src/index';
import { createMockAudioDriver } from './fixtures/mockAudioDriver';

let counter = 0;
const track = (name: string): Track => {
  const videoId = `${name}${++counter}`;
  return { id: videoId, videoId, title: name, artist: 'Artist', duration: 100, thumbnail: '' };
};

function setup(failing: Track[] = []) {
  const failingIds = new Set(failing.map((t) => t.videoId));
  const adapter: NetworkAdapter = {
    name: 'mock',
    fetch: async () => new Response('{}'),
    postJson: async <T>(_url: string, body: any): Promise<T> => {
      if (failingIds.has(body.videoId)) return { playabilityStatus: { status: 'ERROR' } } as T;
      return {
        playabilityStatus: { status: 'OK' },
        streamingData: {
          adaptiveFormats: [
            {
              itag: 251,
              mimeType: 'audio/webm; codecs="opus"',
              bitrate: 160000,
              url: `https://googlevideo.com/videoplayback?itag=251&id=${body.videoId}`,
              initRange: { start: '0', end: '740' },
              indexRange: { start: '741', end: '1024' },
            },
          ],
        },
      } as T;
    },
  };

  const driver: any = createMockAudioDriver({ duration: 100 });
  const loaded: string[] = [];
  const load = driver.load;
  driver.load = async (src: string, startTime?: number) => {
    const mpd = Buffer.from(src.split('base64,')[1], 'base64').toString('utf-8');
    loaded.push(/id=([A-Za-z0-9_]+)/.exec(mpd)![1]);
    return load(src, startTime);
  };

  const engine = new PlayerEngine({ networkAdapter: adapter, audioDriver: driver });
  const errors: Error[] = [];
  engine.on('error', (err) => errors.push(err));
  return { engine, driver, loaded, errors };
}

async function until(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 1000 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(condition(), 'condition not met in time');
}

describe('PlayerEngine queue changes', () => {
  it('loads the next track when the playing track is removed', async () => {
    const [a, b, c] = [track('a'), track('b'), track('c')];
    const { engine, driver, loaded } = setup();
    const changes: Array<[string | undefined, number]> = [];
    engine.setQueue([a, b, c], 0, false);
    await engine.play(0);
    driver.emit('timeUpdate', 42);
    engine.on('trackChange', (t, i) => changes.push([t?.videoId, i]));

    engine.removeFromQueue(0);
    await until(() => loaded.length === 2);

    assert.deepEqual(loaded, [a.videoId, b.videoId]);
    assert.equal(engine.getCurrentTrack()?.videoId, b.videoId);
    assert.equal(engine.getCurrentIndex(), 0);
    assert.equal(engine.getCurrentTime(), 0);
    assert.ok(changes.some(([id, index]) => id === b.videoId && index === 0));
  });

  it('loads the previous track when the playing last track is removed', async () => {
    const [a, b, c] = [track('a'), track('b'), track('c')];
    const { engine, loaded } = setup();
    engine.setQueue([a, b, c], 2, false);
    await engine.play(2);

    engine.removeFromQueue(2);
    await until(() => loaded.length === 2);

    assert.deepEqual(loaded, [c.videoId, b.videoId]);
    assert.equal(engine.getCurrentTrack()?.videoId, b.videoId);
    assert.equal(engine.getCurrentIndex(), 1);
  });

  it('stops without loading when the only track is removed', async () => {
    const a = track('a');
    const { engine, loaded } = setup();
    const changes: Array<[string | undefined, number]> = [];
    engine.setQueue([a], 0, false);
    await engine.play(0);
    engine.on('trackChange', (t, i) => changes.push([t?.videoId, i]));

    engine.removeFromQueue(0);
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.deepEqual(loaded, [a.videoId]);
    assert.equal(engine.getPlaybackState(), 'paused');
    assert.equal(engine.getCurrentIndex(), -1);
    assert.deepEqual(changes, [[undefined, -1]]);
  });

  it('does not resume the old stream when the queue is replaced at the same index', async () => {
    const [a, b, c, d] = [track('a'), track('b'), track('c'), track('d')];
    const { engine, loaded } = setup();
    engine.setQueue([a, b], 0, false);
    await engine.play(0);

    engine.setQueue([c, d], 0, true);
    await until(() => loaded.length === 2);

    assert.deepEqual(loaded, [a.videoId, c.videoId]);
  });

  it('keeps resuming without a reload when the same track is still loaded', async () => {
    const [a, b] = [track('a'), track('b')];
    const { engine, loaded } = setup();
    engine.setQueue([a, b], 0, false);
    await engine.play(0);
    await engine.pause();

    await engine.play();
    await engine.play(0);
    await engine.playTrack(a);

    assert.deepEqual(loaded, [a.videoId]);
    assert.equal(engine.getPlaybackState(), 'playing');
  });
});

describe('PlayerEngine shuffle', () => {
  it('goes back to the track that was played before', async (t) => {
    const tracks = [track('a'), track('b'), track('c'), track('d')];
    const { engine, loaded } = setup();
    const random = t.mock.method(Math, 'random', () => 0.99);
    engine.setShuffle(true);
    engine.setQueue(tracks, 0, false);
    await engine.play(0);
    await engine.next();
    await engine.next();
    assert.deepEqual(loaded, [tracks[0].videoId, tracks[3].videoId, tracks[2].videoId]);

    await engine.previous();
    assert.equal(engine.getCurrentTrack()?.videoId, tracks[3].videoId);
    await engine.previous();
    assert.equal(engine.getCurrentTrack()?.videoId, tracks[0].videoId);
    assert.equal(engine.hasPrevious(), false);
    random.mock.restore();
  });

  it('ends after every track played once when repeat is off', async () => {
    const tracks = [track('a'), track('b'), track('c')];
    const { engine, loaded, driver } = setup();
    engine.setShuffle(true);
    engine.setQueue(tracks, 0, false);
    await engine.play(0);

    driver.emit('ended');
    await until(() => loaded.length === 2);
    driver.emit('ended');
    await until(() => loaded.length === 3);
    driver.emit('ended');
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.equal(new Set(loaded).size, 3);
    assert.equal(loaded.length, 3);
    assert.equal(engine.getPlaybackState(), 'ended');
  });
});

describe('PlayerEngine error events', () => {
  it('emits one error when setQueue fails to play', async () => {
    const bad = track('bad');
    const { engine, errors } = setup([bad]);

    engine.setQueue([bad], 0, true);
    await until(() => engine.getPlaybackState() === 'error');
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(errors.length, 1);
  });

  it('emits one error when removing the playing track lands on a bad track', async () => {
    const [a, bad] = [track('a'), track('bad')];
    const { engine, errors } = setup([bad]);
    engine.setQueue([a, bad], 0, false);
    await engine.play(0);

    engine.removeFromQueue(0);
    await until(() => engine.getPlaybackState() === 'error');
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(errors.length, 1);
  });

  it('emits one error when playback ends into a bad track', async () => {
    const [a, bad] = [track('a'), track('bad')];
    const { engine, driver, errors } = setup([bad]);
    engine.setQueue([a, bad], 0, false);
    await engine.play(0);

    driver.emit('ended');
    await until(() => engine.getPlaybackState() === 'error');
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(errors.length, 1);
  });

  it('still rejects for direct callers and emits one error', async () => {
    const bad = track('bad');
    const { engine, errors } = setup([bad]);
    engine.setQueue([bad], 0, false);

    await assert.rejects(engine.play(0), /Failed to play track/);

    assert.equal(errors.length, 1);
  });
});
