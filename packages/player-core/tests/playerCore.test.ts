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
  ShakaMseAudioDriver,
  buildSabrFormat,
  executeClientWalk,
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

    assert.equal(cache.isBenched('IOS'), false);
    assert.deepEqual(cache.getActiveClients(), ['WEB_REMIX', 'VISIONOS', 'IOS', 'WEB', 'MWEB']);

    cache.bench('IOS', 'Playback restricted');
    assert.equal(cache.isBenched('IOS'), true);
    assert.deepEqual(cache.getActiveClients(), ['WEB_REMIX', 'VISIONOS', 'WEB', 'MWEB']);

    cache.unbench('IOS');
    assert.equal(cache.isBenched('IOS'), false);
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

  it('parses YouTube Music getHomeFeed response (chips, quickPicks, shelves)', () => {
    const client = new InnerTubeClient();

    const mockBrowseResponse = {
      header: {
        chipCloudRenderer: {
          chips: [
            {
              chipCloudChipRenderer: {
                text: { runs: [{ text: 'Energize' }] },
                navigationEndpoint: {
                  browseEndpoint: { browseId: 'FEmusic_home', params: 'ggMDCNgB' },
                },
                isSelected: true,
                uniqueId: 'chip-energize',
              },
            },
            {
              chipCloudChipRenderer: {
                text: { runs: [{ text: 'Relax' }] },
                navigationEndpoint: {
                  browseEndpoint: { browseId: 'FEmusic_home', params: 'ggMDCNgC' },
                },
                isSelected: false,
                uniqueId: 'chip-relax',
              },
            },
            {
              chipCloudChipRenderer: {
                text: { runs: [{ text: 'Workout' }] },
                navigationEndpoint: {
                  browseEndpoint: { browseId: 'FEmusic_home', params: 'ggMDCNgD' },
                },
                isSelected: false,
              },
            },
          ],
        },
      },
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicCarouselShelfRenderer: {
                          header: {
                            musicCarouselShelfBasicHeaderRenderer: {
                              title: { runs: [{ text: 'Quick picks' }] },
                              strapline: { runs: [{ text: 'START RADIO FROM A SONG' }] },
                            },
                          },
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                playlistItemData: { videoId: 'track1' },
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Midnight City' }] },
                                    },
                                  },
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: {
                                        runs: [{ text: 'M83' }, { text: ' • ' }, { text: '4:03' }],
                                      },
                                    },
                                  },
                                ],
                                thumbnail: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [
                                        { url: 'https://example.com/thumb1.jpg', width: 300, height: 300 },
                                      ],
                                    },
                                  },
                                },
                              },
                            },
                            {
                              musicResponsiveListItemRenderer: {
                                playlistItemData: { videoId: 'track2' },
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Starboy' }] },
                                    },
                                  },
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: {
                                        runs: [{ text: 'The Weeknd' }, { text: ' • ' }, { text: '3:50' }],
                                      },
                                    },
                                  },
                                ],
                                thumbnail: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [
                                        { url: 'https://example.com/thumb2.jpg', width: 300, height: 300 },
                                      ],
                                    },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                      {
                        musicCarouselShelfRenderer: {
                          header: {
                            musicCarouselShelfBasicHeaderRenderer: {
                              title: { runs: [{ text: 'Trending Albums & Artists' }] },
                            },
                          },
                          contents: [
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: "Hurry Up, We're Dreaming" }] },
                                subtitle: { runs: [{ text: 'Album • M83' }] },
                                navigationEndpoint: {
                                  browseEndpoint: { browseId: 'MPREb_123' },
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [{ url: 'https://example.com/album.jpg' }],
                                    },
                                  },
                                },
                              },
                            },
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: "Today's Hits" }] },
                                subtitle: { runs: [{ text: 'Playlist • YouTube Music' }] },
                                navigationEndpoint: {
                                  browseEndpoint: { browseId: 'VLPL123' },
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [{ url: 'https://example.com/playlist.jpg' }],
                                    },
                                  },
                                },
                              },
                            },
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: 'Daft Punk' }] },
                                subtitle: { runs: [{ text: 'Artist • 10M subscribers' }] },
                                navigationEndpoint: {
                                  browseEndpoint: { browseId: 'UC123' },
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [{ url: 'https://example.com/daft.jpg' }],
                                    },
                                  },
                                },
                              },
                            },
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: 'One More Time' }] },
                                subtitle: { runs: [{ text: 'Song • Daft Punk' }] },
                                navigationEndpoint: {
                                  watchEndpoint: { videoId: 'song123' },
                                },
                                thumbnailRenderer: {
                                  musicThumbnailRenderer: {
                                    thumbnail: {
                                      thumbnails: [{ url: 'https://example.com/song.jpg' }],
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

    const feed = client.parseHomeFeed(mockBrowseResponse);

    // Verify chips
    assert.equal(feed.chips.length, 3);
    assert.equal(feed.chips[0].id, 'chip-energize');
    assert.equal(feed.chips[0].title, 'Energize');
    assert.equal(feed.chips[0].params, 'ggMDCNgB');
    assert.equal(feed.chips[0].isActive, true);
    assert.equal(feed.chips[1].id, 'chip-relax');
    assert.equal(feed.chips[1].title, 'Relax');
    assert.equal(feed.chips[1].isActive, false);
    assert.equal(feed.chips[2].title, 'Workout');
    assert.equal(feed.chips[2].params, 'ggMDCNgD');

    // Verify quickPicks
    assert.equal(feed.quickPicks.length, 2);
    assert.equal(feed.quickPicks[0].videoId, 'track1');
    assert.equal(feed.quickPicks[0].title, 'Midnight City');
    assert.equal(feed.quickPicks[0].artist, 'M83');
    assert.equal(feed.quickPicks[0].duration, 243);
    assert.equal(feed.quickPicks[0].thumbnail, 'https://example.com/thumb1.jpg');
    assert.equal(feed.quickPicks[1].videoId, 'track2');
    assert.equal(feed.quickPicks[1].title, 'Starboy');
    assert.equal(feed.quickPicks[1].duration, 230);

    // Verify shelves
    assert.equal(feed.shelves.length, 2);
    assert.equal(feed.shelves[0].title, 'Quick picks');
    assert.equal(feed.shelves[0].subtitle, 'START RADIO FROM A SONG');
    assert.equal(feed.shelves[0].items.length, 2);

    assert.equal(feed.shelves[1].title, 'Trending Albums & Artists');
    assert.equal(feed.shelves[1].items.length, 4);
    assert.equal(feed.shelves[1].items[0].title, "Hurry Up, We're Dreaming");
    assert.equal(feed.shelves[1].items[0].type, 'album');
    assert.equal(feed.shelves[1].items[0].browseId, 'MPREb_123');

    assert.equal(feed.shelves[1].items[1].title, "Today's Hits");
    assert.equal(feed.shelves[1].items[1].type, 'playlist');
    assert.equal(feed.shelves[1].items[1].browseId, 'VLPL123');

    assert.equal(feed.shelves[1].items[2].title, 'Daft Punk');
    assert.equal(feed.shelves[1].items[2].type, 'artist');
    assert.equal(feed.shelves[1].items[2].browseId, 'UC123');

    assert.equal(feed.shelves[1].items[3].title, 'One More Time');
    assert.equal(feed.shelves[1].items[3].type, 'song');
    assert.equal(feed.shelves[1].items[3].videoId, 'song123');
  });

  it('queries /youtubei/v1/browse with WEB_REMIX context and moodParam in getHomeFeed', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: Record<string, string> = {};

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> => {
        capturedUrl = url;
        capturedBody = body;
        capturedHeaders = headers;
        return {
          contents: {},
        } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    await client.getHomeFeed('mood_test_123');

    assert.ok(capturedUrl.includes('/youtubei/v1/browse'));
    assert.equal(capturedBody.browseId, 'FEmusic_home');
    assert.equal(capturedBody.params, 'mood_test_123');
    assert.equal(capturedBody.context.client.clientName, 'WEB_REMIX');
    assert.equal(capturedHeaders['X-YouTube-Client-Name'], 'WEB_REMIX');
  });

  it('parses YouTube Music getNextRadio response (queue, related)', () => {
    const client = new InnerTubeClient();

    const mockNextResponse = {
      contents: {
        singleColumnMusicWatchNextResultsRenderer: {
          tabbedRenderer: {
            watchNextTabbedResultsRenderer: {
              tabs: [
                {
                  tabRenderer: {
                    title: { runs: [{ text: 'Up next' }] },
                    content: {
                      musicQueueRenderer: {
                        content: {
                          playlistPanelRenderer: {
                            contents: [
                              {
                                playlistPanelVideoRenderer: {
                                  videoId: 'queue1',
                                  title: { runs: [{ text: 'Get Lucky' }] },
                                  shortBylineText: { runs: [{ text: 'Daft Punk' }] },
                                  lengthText: { runs: [{ text: '4:08' }] },
                                  thumbnail: {
                                    thumbnails: [{ url: 'https://example.com/qlarge.jpg' }],
                                  },
                                },
                              },
                              {
                                playlistPanelVideoRenderer: {
                                  videoId: 'queue2',
                                  title: { runs: [{ text: 'Instant Crush' }] },
                                  shortBylineText: { runs: [{ text: 'Daft Punk ft. Julian Casablancas' }] },
                                  lengthText: { runs: [{ text: '5:37' }] },
                                  thumbnail: {
                                    thumbnails: [{ url: 'https://example.com/q2.jpg' }],
                                  },
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
                {
                  tabRenderer: {
                    title: { runs: [{ text: 'Lyrics' }] },
                  },
                },
                {
                  tabRenderer: {
                    title: { runs: [{ text: 'Related' }] },
                    content: {
                      sectionListRenderer: {
                        contents: [
                          {
                            musicCarouselShelfRenderer: {
                              header: {
                                musicCarouselShelfBasicHeaderRenderer: {
                                  title: { runs: [{ text: 'Similar Artists' }] },
                                },
                              },
                              contents: [
                                {
                                  musicTwoRowItemRenderer: {
                                    title: { runs: [{ text: 'Justice' }] },
                                    subtitle: { runs: [{ text: 'Artist • 2M subscribers' }] },
                                    navigationEndpoint: {
                                      browseEndpoint: { browseId: 'UC_justice' },
                                    },
                                    thumbnailRenderer: {
                                      musicThumbnailRenderer: {
                                        thumbnail: {
                                          thumbnails: [{ url: 'https://example.com/justice.jpg' }],
                                        },
                                      },
                                    },
                                  },
                                },
                                {
                                  musicTwoRowItemRenderer: {
                                    title: { runs: [{ text: 'Discovery' }] },
                                    subtitle: { runs: [{ text: 'Album • Daft Punk' }] },
                                    navigationEndpoint: {
                                      browseEndpoint: { browseId: 'MPREb_discovery' },
                                    },
                                    thumbnailRenderer: {
                                      musicThumbnailRenderer: {
                                        thumbnail: {
                                          thumbnails: [{ url: 'https://example.com/discovery.jpg' }],
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
        },
      },
    };

    const result = client.parseNextRadio(mockNextResponse);

    // Verify queue
    assert.equal(result.queue.length, 2);
    assert.equal(result.queue[0].videoId, 'queue1');
    assert.equal(result.queue[0].title, 'Get Lucky');
    assert.equal(result.queue[0].artist, 'Daft Punk');
    assert.equal(result.queue[0].duration, 248);
    assert.equal(result.queue[0].thumbnail, 'https://example.com/qlarge.jpg');

    assert.equal(result.queue[1].videoId, 'queue2');
    assert.equal(result.queue[1].title, 'Instant Crush');
    assert.equal(result.queue[1].artist, 'Daft Punk ft. Julian Casablancas');
    assert.equal(result.queue[1].duration, 337);

    // Verify related
    assert.equal(result.related.length, 2);
    assert.equal(result.related[0].title, 'Justice');
    assert.equal(result.related[0].type, 'artist');
    assert.equal(result.related[0].browseId, 'UC_justice');

    assert.equal(result.related[1].title, 'Discovery');
    assert.equal(result.related[1].type, 'album');
    assert.equal(result.related[1].browseId, 'MPREb_discovery');
  });

  it('queries /youtubei/v1/next with WEB_REMIX context and videoId in getNextRadio', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: Record<string, string> = {};

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> => {
        capturedUrl = url;
        capturedBody = body;
        capturedHeaders = headers;
        return {
          contents: {},
        } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    await client.getNextRadio('test_video_abc');

    assert.ok(capturedUrl.includes('/youtubei/v1/next'));
    assert.equal(capturedBody.videoId, 'test_video_abc');
    assert.equal(capturedBody.context.client.clientName, 'WEB_REMIX');
    assert.equal(capturedHeaders['X-YouTube-Client-Name'], 'WEB_REMIX');
  });

  it('generates SABR DASH MPD XML with is_sabr: true and sabr: protocol URIs', () => {
    const formats: AudioFormat[] = [
      {
        itag: 251,
        mimeType: 'audio/webm; codecs="opus"',
        bitrate: 160000,
        audioSampleRate: '48000',
        audioChannels: 2,
        is_sabr: true,
        initRange: { start: '0', end: '740' },
        indexRange: { start: '741', end: '1024' },
      },
      {
        itag: 140,
        mimeType: 'audio/mp4; codecs="mp4a.40.2"',
        bitrate: 128000,
        audioSampleRate: '44100',
        audioChannels: 2,
        is_sabr: true,
        initRange: { start: '0', end: '632' },
        indexRange: { start: '633', end: '896' },
      },
    ];

    const xml = generateDashMpd(formats, { is_sabr: true, durationMs: 210000 });
    assert.ok(xml.includes('is_sabr="true"'));
    assert.ok(xml.includes('<BaseURL>sabr://audio?key='));
    assert.ok(xml.includes('Representation id="251"'));
    assert.ok(xml.includes('codecs="opus"'));
    assert.ok(xml.includes('Representation id="140"'));
    assert.ok(xml.includes('codecs="mp4a.40.2"'));
    assert.ok(xml.includes('<SegmentBase indexRange="741-1024">'));
  });

  it('prioritizes WEB_REMIX with SABR formats in executeClientWalk', async () => {
    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        if (clientName === 'WEB_REMIX') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              serverAbrStreamingUrl: 'https://googlevideo.com/videoplayback?serverabr=1',
              adaptiveFormats: [
                {
                  itag: 251,
                  mimeType: 'audio/webm; codecs="opus"',
                  bitrate: 160000,
                  audioSampleRate: '48000',
                  approxDurationMs: '240000',
                },
                {
                  itag: 140,
                  mimeType: 'audio/mp4; codecs="mp4a.40.2"',
                  bitrate: 128000,
                  audioSampleRate: '44100',
                  approxDurationMs: '240000',
                },
              ],
            },
          } as T;
        }
        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    const result = await executeClientWalk('sample_vid', client, new VerdictCache());

    assert.equal(result.client, 'WEB_REMIX');
    assert.equal(result.is_sabr, true);
    assert.equal(result.audioFormats.length, 2);
    assert.equal(result.audioFormats[0].is_sabr, true);
    assert.ok(result.serverAbrStreamingUrl?.includes('serverabr=1'));
  });

  it('supports direct formats with VISIONOS when WEB_REMIX is unavailable', async () => {
    const cache = new VerdictCache();
    cache.bench('WEB_REMIX', 'Benched for test');

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        if (clientName === 'VISIONOS') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 251,
                  mimeType: 'audio/webm; codecs="opus"',
                  bitrate: 160000,
                  url: 'https://googlevideo.com/videoplayback?itag=251&sparams=visionos',
                  initRange: { start: '0', end: '740' },
                  indexRange: { start: '741', end: '1024' },
                },
              ],
            },
          } as T;
        }
        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    const result = await executeClientWalk('sample_visionos_vid', client, cache);

    assert.equal(result.client, 'VISIONOS');
    assert.equal(result.is_sabr, false);
    assert.equal(result.audioFormats.length, 1);
    assert.ok(result.audioFormats[0].url?.includes('visionos'));
  });

  it('buildSabrFormat builds valid SABR formats and ShakaMseAudioDriver initializes cleanly', async () => {
    const sabrFmt = buildSabrFormat({
      itag: 251,
      mimeType: 'audio/webm; codecs="opus"',
      bitrate: 160000,
      audioSampleRate: '48000',
      audioChannels: 2,
    } as any);

    assert.equal(sabrFmt.itag, 251);
    assert.equal(sabrFmt.codecCode, 'o');

    const driver = new ShakaMseAudioDriver();
    assert.equal(driver.name, 'shaka-mse');
    assert.equal(driver.getState(), 'idle');
    await driver.initialize();
    assert.equal(driver.getState(), 'idle');
    await driver.destroy();
  });
});
