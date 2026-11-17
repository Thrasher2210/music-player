import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INNERTUBE_CONTEXTS,
  InnerTubeClient,
  VerdictCache,
  CLIENT_WALK_PRIORITY,
  BENCH_DURATION_MS,
  generateDashMpd,
  createDashDataUri,
  NativeHttpAdapter,
  DevProxyAdapter,
  WebExtensionAdapter,
  PlayerEngine,
  AudioFormat,
  Track,
} from '../src/index';

describe('@mp/player-core unit tests', () => {
  it('defines InnerTube contexts with correct specifications', () => {
    assert.equal(INNERTUBE_CONTEXTS.VISIONOS.client.clientName, 'VISIONOS');
    assert.equal(INNERTUBE_CONTEXTS.VISIONOS.client.clientVersion, '1.02');
    assert.equal(INNERTUBE_CONTEXTS.IOS.client.clientName, 'iOS');
    assert.equal(INNERTUBE_CONTEXTS.WEB_REMIX.client.clientName, 'WEB_REMIX');
    assert.equal(INNERTUBE_CONTEXTS.WEB.client.clientName, 'WEB');
    assert.equal(INNERTUBE_CONTEXTS.MWEB.client.clientName, 'MWEB');
  });

  it('parses YouTube Music search responses correctly', () => {
    const client = new InnerTubeClient();
    const mockYtmResponse = {
      contents: {
        tabbedSearchResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicShelfRenderer: {
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                playlistItemData: { videoId: 'abc123xyz' },
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: {
                                        runs: [{ text: 'Midnight City' }],
                                      },
                                    },
                                  },
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: {
                                        runs: [
                                          { text: 'M83' },
                                          { text: ' • ' },
                                          { text: 'Hurry Up, We\'re Dreaming' },
                                          { text: ' • ' },
                                          { text: '4:03' },
                                        ],
                                      },
                                    },
                                  },
                                ],
                                thumbnail: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [
                                        { url: 'https://example.com/thumb_small.jpg', width: 60, height: 60 },
                                        { url: 'https://example.com/thumb_large.jpg', width: 540, height: 540 },
                                      ],
                                    },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    };

    const tracks = client.parseSearchResults(mockYtmResponse);
    assert.equal(tracks.length, 1);
    assert.equal(tracks[0].videoId, 'abc123xyz');
    assert.equal(tracks[0].title, 'Midnight City');
    assert.equal(tracks[0].artist, 'M83');
    assert.equal(tracks[0].duration, 243); // 4 * 60 + 3
    assert.equal(tracks[0].thumbnail, 'https://example.com/thumb_large.jpg');
  });

  it('benches failing clients in VerdictCache for 10 minutes', () => {
    const cache = new VerdictCache();
    cache.clear();

    assert.equal(cache.isBenched('VISIONOS'), false);
    assert.deepEqual(cache.getActiveClients(), ['VISIONOS', 'IOS', 'WEB_REMIX', 'WEB', 'MWEB']);

    cache.bench('VISIONOS', 'Playback restricted');
    assert.equal(cache.isBenched('VISIONOS'), true);
    assert.deepEqual(cache.getActiveClients(), ['IOS', 'WEB_REMIX', 'WEB', 'MWEB']);

    cache.unbench('VISIONOS');
    assert.equal(cache.isBenched('VISIONOS'), false);
  });

  it('generates synthetic DASH MPD XML with Opus (251) and AAC (140)', () => {
    const formats: AudioFormat[] = [
      {
        itag: 251,
        mimeType: 'audio/webm; codecs="opus"',
        bitrate: 135000,
        audioSampleRate: '48000',
        audioChannels: 2,
        url: 'https://googlevideo.com/videoplayback?itag=251&sparams=test',
        initRange: { start: '0', end: '740' },
        indexRange: { start: '741', end: '1024' },
      },
      {
        itag: 140,
        mimeType: 'audio/mp4; codecs="mp4a.40.2"',
        bitrate: 128000,
        audioSampleRate: '44100',
        audioChannels: 2,
        url: 'https://googlevideo.com/videoplayback?itag=140&sparams=test',
        initRange: { start: '0', end: '632' },
        indexRange: { start: '633', end: '896' },
      },
    ];

    const xml = generateDashMpd(formats, { durationMs: 243000 });
    assert.ok(xml.includes('<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"'));
    assert.ok(xml.includes('mediaPresentationDuration="PT243.000S"'));
    assert.ok(xml.includes('Representation id="251"'));
    assert.ok(xml.includes('codecs="opus"'));
    assert.ok(xml.includes('Representation id="140"'));
    assert.ok(xml.includes('codecs="mp4a.40.2"'));
    assert.ok(xml.includes('<SegmentBase indexRange="741-1024">'));
    assert.ok(xml.includes('<Initialization range="0-740"/>'));
    // Ensures XML escaping of '&'
    assert.ok(xml.includes('&amp;sparams=test'));

    const dataUri = createDashDataUri(xml);
    assert.ok(dataUri.startsWith('data:application/dash+xml;'));
  });

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
    engine.on('queueChange', (q) => {
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

  it('verifies adapters instantiate and configure correctly', () => {
    const native = new NativeHttpAdapter();
    assert.equal(native.name, 'native-http');

    const devProxy = new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
    assert.equal(devProxy.name, 'dev-proxy');

    const extAdapter = new WebExtensionAdapter(5000);
    assert.equal(extAdapter.name, 'web-extension');
  });
});
