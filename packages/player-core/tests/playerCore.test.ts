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
  prefetchAudioWarmup,
  prefetchStream,
  isStreamCached,
  invalidateStreamCache,
  NetworkAdapter,
} from '../src/index';

describe('@mp/player-core unit tests', () => {
  it('defines InnerTube contexts with correct specifications', () => {
    assert.equal(INNERTUBE_CONTEXTS.VISIONOS.client.clientName, 'VISIONOS');
    assert.equal(INNERTUBE_CONTEXTS.VISIONOS.client.clientVersion, '1.02');
    assert.equal(INNERTUBE_CONTEXTS.IOS.client.clientName, 'iOS');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.clientName, 'ANDROID_MUSIC');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.clientVersion, '6.40.52');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.osName, 'Android');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.osVersion, '14');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.platform, 'MOBILE');
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

    assert.equal(cache.isBenched('ANDROID_MUSIC'), false);
    assert.deepEqual(cache.getActiveClients(), ['IOS', 'VISIONOS', 'ANDROID_MUSIC', 'WEB_REMIX', 'WEB', 'MWEB']);

    cache.bench('ANDROID_MUSIC', 'Playback restricted');
    assert.equal(cache.isBenched('ANDROID_MUSIC'), true);
    assert.deepEqual(cache.getActiveClients(), ['IOS', 'VISIONOS', 'WEB_REMIX', 'WEB', 'MWEB']);

    cache.unbench('ANDROID_MUSIC');
    assert.equal(cache.isBenched('ANDROID_MUSIC'), false);
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

  it('supports ANDROID_MUSIC client context in executeClientWalk when earlier clients fail', async () => {
    const cache = new VerdictCache();
    cache.bench('VISIONOS', 'Benched for test');
    cache.bench('IOS', 'Benched for test');

    let usedClientName = '';
    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        usedClientName = clientName;
        if (clientName === 'ANDROID_MUSIC') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 140,
                  mimeType: 'audio/mp4; codecs="mp4a.40.2"',
                  bitrate: 128000,
                  url: 'https://googlevideo.com/videoplayback?itag=140&client=android_music',
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

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    const result = await executeClientWalk('sample_android_vid', client, cache);

    assert.equal(result.client, 'ANDROID_MUSIC');
    assert.equal(usedClientName, 'ANDROID_MUSIC');
    assert.equal(result.audioFormats.length, 1);
    assert.ok(result.audioFormats[0].url?.includes('android_music'));
  });

  it('prefetches audio warmup by requesting bytes=0-262143 range for the next track', async () => {
    let fetchCalledWithUrl = '';
    let fetchHeaders: Record<string, string> = {};

    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async (url: string, init?: RequestInit) => {
        fetchCalledWithUrl = url;
        if (init?.headers) {
          const headers = new Headers(init.headers);
          headers.forEach((val, key) => {
            fetchHeaders[key.toLowerCase()] = val;
          });
        }
        return new Response(new Uint8Array(262144), { status: 206 });
      },
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
                  url: 'https://googlevideo.com/videoplayback?itag=251&sparams=warmup',
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

    const nextTrack: Track = {
      id: 'warmup_vid_123',
      videoId: 'warmup_vid_123',
      title: 'Warmup Track',
      artist: 'Warmup Artist',
      duration: 210,
      thumbnail: 'https://example.com/thumb.jpg',
    };

    const cache = new VerdictCache();
    await prefetchAudioWarmup(nextTrack, mockAdapter, cache);

    assert.ok(fetchCalledWithUrl.includes('sparams=warmup'));
    assert.equal(fetchHeaders['range'], 'bytes=0-262143');
  });

  it('resolves direct stream URLs when extension is active in DevProxyAdapter', () => {
    const devProxy = new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
    const rawStreamUrl = 'https://rr1---sn-example.googlevideo.com/videoplayback?itag=251';

    // In non-browser / normal environment, returns proxied URL
    const proxiedUrl = devProxy.resolveStreamUrl(rawStreamUrl);
    assert.ok(proxiedUrl.includes('/api/yt/stream?url='));
    assert.ok(proxiedUrl.includes(encodeURIComponent(rawStreamUrl)));

    // When window.__MP_EXTENSION_ACTIVE__ is active, returns direct stream URL
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        location: { origin: 'http://localhost:3000' },
        __MP_EXTENSION_ACTIVE__: true,
      };

      const directUrl = devProxy.resolveStreamUrl(rawStreamUrl);
      assert.equal(directUrl, rawStreamUrl);

      // When __MP_EXTENSION_ACTIVE__ is false, returns proxied URL
      (globalThis as any).window.__MP_EXTENSION_ACTIVE__ = false;
      const fallbackUrl = devProxy.resolveStreamUrl(rawStreamUrl);
      assert.ok(fallbackUrl.includes('/api/yt/stream?url='));
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
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

    let driverState = 'idle';
    let loadedSrc = '';
    let loadedStartTime = -1;
    const listeners: Record<string, Function[]> = {};

    const mockDriver: any = {
      name: 'mock-driver',
      initialize: async () => {},
      destroy: async () => {},
      load: async (src: string, startTime = 0) => {
        loadedSrc = src;
        loadedStartTime = startTime;
        driverState = 'paused';
      },
      play: async () => {
        driverState = 'playing';
      },
      pause: async () => {
        driverState = 'paused';
      },
      seek: async () => {},
      setVolume: () => {},
      getVolume: () => 1,
      setPlaybackRate: () => {},
      getPlaybackRate: () => 1,
      getCurrentTime: () => 45,
      getDuration: () => 200,
      isPaused: () => driverState === 'paused',
      getState: () => driverState,
      hasLoadedStream: () => Boolean(loadedSrc),
      on: (event: string, fn: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
        return () => {};
      },
      off: () => {},
      emit: (event: string, ...args: any[]) => {
        listeners[event]?.forEach((fn) => fn(...args));
      },
    };

    const engine = new PlayerEngine({
      networkAdapter: mockAdapter,
      audioDriver: mockDriver,
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
    assert.equal(loadedStartTime, 0);

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
    assert.equal(loadedStartTime, 45);
  });

  it('supports setPlaybackRate and getPlaybackRate on ShakaMseAudioDriver syncing with mediaElement', () => {
    const driver = new ShakaMseAudioDriver();
    assert.equal(driver.getPlaybackRate(), 1);

    driver.setPlaybackRate(1.5);
    assert.equal(driver.getPlaybackRate(), 1.5);

    // Test synchronization with mediaElement
    const mockMediaEl = {
      playbackRate: 1.5,
      volume: 1,
    } as HTMLMediaElement;
    (driver as any).mediaElement = mockMediaEl;

    driver.setPlaybackRate(1.25);
    assert.equal(mockMediaEl.playbackRate, 1.25);
    assert.equal(driver.getPlaybackRate(), 1.25);

    mockMediaEl.playbackRate = 0.75;
    assert.equal(driver.getPlaybackRate(), 0.75);
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

    const listeners: Record<string, Function[]> = {};
    let driverRate = 1.0;
    const mockDriver: any = {
      name: 'mock-driver',
      initialize: async () => {},
      destroy: async () => {},
      load: async () => {},
      play: async () => {},
      pause: async () => {},
      seek: async () => {},
      setVolume: () => {},
      getVolume: () => 1,
      setPlaybackRate: (r: number) => {
        driverRate = r;
      },
      getPlaybackRate: () => driverRate,
      getCurrentTime: () => 0,
      getDuration: () => 100,
      isPaused: () => false,
      getState: () => 'playing',
      on: (event: string, fn: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
        return () => {};
      },
      off: () => {},
      emit: (event: string, ...args: any[]) => {
        listeners[event]?.forEach((fn) => fn(...args));
      },
    };

    const engine = new PlayerEngine({
      networkAdapter: mockAdapter,
      audioDriver: mockDriver,
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
});
