import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PlayerEngine,
  Track,
  NetworkAdapter,
  isStreamCached,
  invalidateStreamCache,
} from '../src/index';
import { createMockAudioDriver } from './fixtures/mockAudioDriver';

describe('PlayerEngine', () => {
  it('manages queue and emits events in PlayerEngine', () => {
    const engine = new PlayerEngine();

    const sampleTracks: Track[] = [
      {
        id: 'track1',
        videoId: 'vid1',
        title: 'Song One',
        artist: 'Artist A',
        duration: 180,
        thumbnail: 'https://example.com/1.jpg',
      },
      {
        id: 'track2',
        videoId: 'vid2',
        title: 'Song Two',
        artist: 'Artist B',
        duration: 200,
        thumbnail: 'https://example.com/2.jpg',
      },
    ];

    let queueChangeEmitted = false;
    engine.on('queueChange', () => {
      queueChangeEmitted = true;
    });

    engine.setQueue(sampleTracks, 0, false);
    assert.equal(queueChangeEmitted, true);
    assert.equal(engine.getQueue().length, 2);
    assert.equal(engine.getCurrentIndex(), 0);
    assert.equal(engine.getCurrentTrack()?.title, 'Song One');

    engine.setVolume(0.8);
    assert.equal(engine.getVolume(), 0.8);

    engine.setRepeatMode('all');
    assert.equal(engine.getRepeatMode(), 'all');

    engine.setShuffle(true);
    assert.equal(engine.getShuffle(), true);
  });

  it('transparently benches failing client and recovers at currentTime on chunk stall/403', async () => {
    const requestedClients: string[] = [];

    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        requestedClients.push(clientName);

        // First call (VISIONOS) succeeds with initial stream
        if (clientName === 'VISIONOS') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 251,
                  mimeType: 'audio/webm; codecs="opus"',
                  bitrate: 160000,
                  url: 'https://googlevideo.com/videoplayback?itag=251&sparams=visionos_initial',
                  initRange: { start: '0', end: '740' },
                  indexRange: { start: '741', end: '1024' },
                },
              ],
            },
          } as T;
        }

        // On mid-stream failure, VISIONOS is benched so ANDROID_MUSIC is called for recovery
        if (clientName === 'ANDROID_MUSIC') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 140,
                  mimeType: 'audio/mp4; codecs="mp4a.40.2"',
                  bitrate: 128000,
                  url: 'https://googlevideo.com/videoplayback?itag=140&sparams=android_music_recovered',
                  initRange: { start: '0', end: '632' },
                  indexRange: { start: '633', end: '896' },
                },
              ],
            },
          } as T;
        }

        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const mockDriver = createMockAudioDriver({ currentTime: 45, duration: 200 });

    const engine = new PlayerEngine({
      networkAdapter: mockAdapter,
      audioDriver: mockDriver as any,
    });

    const testTrack: Track = {
      id: 'recover_test',
      videoId: 'recover_test',
      title: 'Recovery Song',
      artist: 'Recovery Artist',
      duration: 200,
      thumbnail: 'https://example.com/test.jpg',
    };

    await engine.playTrack(testTrack);
    assert.equal(engine.getActiveClient(), 'VISIONOS');
    assert.equal(mockDriver.getLoadedStartTime(), 0);

    // Simulate playback reaching 45 seconds
    mockDriver.emit('timeUpdate', 45);
    assert.equal(engine.getCurrentTime(), 45);

    // Simulate a mid-stream 403 chunk stall error from audio driver
    mockDriver.emit('error', new Error('HTTP 403 Forbidden: chunk stall'));

    // Wait for the async recovery play() to resolve
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify VISIONOS was benched and transparent recovery switched to ANDROID_MUSIC at currentTime (45s)
    assert.equal(engine.getVerdictCache().isBenched('VISIONOS'), true);
    assert.equal(engine.getActiveClient(), 'ANDROID_MUSIC');
    assert.equal(mockDriver.getLoadedStartTime(), 45);
  });

  it('manages playbackRate and emits playbackRateChange in PlayerEngine', () => {
    let driverRate = 1.0;
    const mockDriver: any = {
      name: 'mock',
      initialize: async () => {},
      destroy: async () => {},
      load: async () => {},
      play: async () => {},
      pause: async () => {},
      seek: async () => {},
      setVolume: () => {},
      getVolume: () => 1,
      setPlaybackRate: (rate: number) => {
        driverRate = rate;
      },
      getPlaybackRate: () => driverRate,
      getCurrentTime: () => 0,
      getDuration: () => 0,
      isPaused: () => true,
      getState: () => 'idle',
      on: () => () => {},
      off: () => {},
    };

    const engine = new PlayerEngine({ audioDriver: mockDriver });
    assert.equal(engine.getPlaybackRate(), 1.0);

    let emittedRate = 0;
    engine.on('playbackRateChange', (rate) => {
      emittedRate = rate;
    });

    engine.setPlaybackRate(1.75);
    assert.equal(engine.getPlaybackRate(), 1.75);
    assert.equal(driverRate, 1.75);
    assert.equal(emittedRate, 1.75);
  });

  it('triggers near-end prefetch when currentTime >= duration - 10 for upcoming track in queue', async () => {
    const prefetchedVideoIds: string[] = [];

    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const videoId = body.videoId;
        prefetchedVideoIds.push(videoId);
        return {
          playabilityStatus: { status: 'OK' },
          streamingData: {
            adaptiveFormats: [
              {
                itag: 251,
                mimeType: 'audio/webm; codecs="opus"',
                bitrate: 160000,
                url: `https://googlevideo.com/videoplayback?itag=251&id=${videoId}`,
              },
            ],
          },
        } as T;
      },
    };

    const mockDriver = createMockAudioDriver({ duration: 100, state: 'playing', isPaused: false });

    const engine = new PlayerEngine({
      networkAdapter: mockAdapter,
      audioDriver: mockDriver as any,
    });

    const track1: Track = {
      id: 'prefetch_t1',
      videoId: 'prefetch_v1',
      title: 'Prefetch Song 1',
      artist: 'Prefetch Artist 1',
      duration: 100,
      thumbnail: 'https://example.com/1.jpg',
    };
    const track2: Track = {
      id: 'prefetch_t2',
      videoId: 'prefetch_v2',
      title: 'Prefetch Song 2',
      artist: 'Prefetch Artist 2',
      duration: 120,
      thumbnail: 'https://example.com/2.jpg',
    };

    invalidateStreamCache();
    engine.setQueue([track1, track2], 0, false);
    mockDriver.emit('durationChange', 100);

    // At currentTime = 50, duration - 10 = 90, so prefetch shouldn't trigger yet
    mockDriver.emit('timeUpdate', 50);
    assert.equal(prefetchedVideoIds.includes('prefetch_v2'), false);
    assert.equal(isStreamCached('prefetch_v2'), false);

    // At currentTime = 90 (>= 100 - 10), prefetch triggers for next track in queue
    mockDriver.emit('timeUpdate', 90);
    // Allow async prefetch to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(prefetchedVideoIds.includes('prefetch_v2'), true);
    assert.equal(isStreamCached('prefetch_v2'), true);

    // Further timeUpdates shouldn't re-trigger because it's already cached
    const countBefore = prefetchedVideoIds.filter((id) => id === 'prefetch_v2').length;
    mockDriver.emit('timeUpdate', 91);
    mockDriver.emit('timeUpdate', 95);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const countAfter = prefetchedVideoIds.filter((id) => id === 'prefetch_v2').length;
    assert.equal(countBefore, countAfter);
  });

  it('resets currentTime to 0 and seeks to 0 when starting a new track', async () => {
    let loadedStartTime: number | undefined;
    const mockDriver: any = {
      name: 'mock', state: 'idle',
      getState: () => mockDriver.state, isPaused: () => false, hasLoadedStream: () => true,
      listeners: {} as Record<string, Function[]>,
      on: (event: string, fn: Function) => {
        if (!mockDriver.listeners[event]) mockDriver.listeners[event] = [];
        mockDriver.listeners[event].push(fn);
        return () => {};
      },
      emit: (event: string, ...args: any[]) => {
        for (const fn of mockDriver.listeners[event] || []) fn(...args);
      },
      load: async (_src: string, startTime = 0) => { loadedStartTime = startTime; mockDriver.state = 'playing'; },
      play: async () => {}, pause: async () => {}, destroy: async () => {},
    };

    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async () => ({
        playabilityStatus: { status: 'OK' },
        streamingData: { adaptiveFormats: [{ itag: 251, mimeType: 'audio/webm; codecs="opus"', url: 'https://example.com/audio.webm' }] },
      }),
    };

    const engine = new PlayerEngine({ networkAdapter: mockAdapter, audioDriver: mockDriver });
    engine.setQueue([{ id: '1', videoId: 't1', title: 'T1', duration: 200 }, { id: '2', videoId: 't2', title: 'T2', duration: 200 }]);

    await engine.play(0);
    mockDriver.emit('timeUpdate', 103);
    assert.equal(engine.getCurrentTime(), 103);

    // Switch to track 2
    await engine.play(1);
    assert.equal(engine.getCurrentTime(), 0);
    assert.equal(loadedStartTime, 0);
  });
});
