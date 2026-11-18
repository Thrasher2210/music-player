import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lyricsResponseSchema } from '@mp/api-contract';
import {
  cleanTitle,
  cleanArtist,
  sanitizeTrackMetadata,
} from '../src/lyrics/sanitizer.js';
import { parseLrc, parseTimeToSeconds } from '../src/lyrics/parser.js';
import { LrclibProvider } from '../src/lyrics/providers/lrclib.js';
import { InnertubeProvider } from '../src/lyrics/providers/innertube.js';
import { KugouProvider } from '../src/lyrics/providers/kugou.js';
import { LyricsManager } from '../src/lyrics/manager.js';
import type { Cache } from '../src/cache.js';
import type { LyricsProvider, LyricsQuery, LyricsResult } from '../src/lyrics/types.js';

describe('1. lyricsResponseSchema (Shared Contract)', () => {
  it('validates a complete synced lyrics payload with syllable words', () => {
    const payload = {
      videoId: 'dQw4w9WgXcQ',
      synced: true,
      lines: [
        {
          time: 12.34,
          timeMs: 12340,
          text: 'Never gonna give you up',
          words: [
            { time: 12.34, text: 'Never ' },
            { time: 12.8, text: 'gonna ' },
            { time: 13.2, text: 'give ' },
            { time: 13.5, text: 'you ' },
            { time: 13.8, text: 'up' },
          ],
        },
      ],
      plainLyrics: 'Never gonna give you up',
      source: 'lrclib',
    };

    const parsed = lyricsResponseSchema.parse(payload);
    assert.equal(parsed.videoId, 'dQw4w9WgXcQ');
    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 1);
    assert.equal(parsed.lines[0].time, 12.34);
    assert.equal(parsed.lines[0].timeMs, 12340);
    assert.equal(parsed.lines[0].words?.length, 5);
    assert.equal(parsed.source, 'lrclib');
  });

  it('validates unsynced plain lyrics', () => {
    const payload = {
      videoId: 'abc12345',
      synced: false,
      lines: [],
      plainLyrics: 'Just plain lyrics here',
      source: 'innertube',
    };

    const parsed = lyricsResponseSchema.parse(payload);
    assert.equal(parsed.synced, false);
    assert.equal(parsed.lines.length, 0);
    assert.equal(parsed.plainLyrics, 'Just plain lyrics here');
    assert.equal(parsed.source, 'innertube');
  });

  it('rejects invalid videoId or negative time', () => {
    assert.throws(() => {
      lyricsResponseSchema.parse({
        videoId: '',
        synced: true,
        lines: [],
        source: 'none',
      });
    });
  });
});

describe('2. Sanitizer (clean YouTube title noise and extract artist/title)', () => {
  it('cleans typical YouTube noise tags: (Official Music Video), [HD], [4K], etc.', () => {
    const raw = 'Never Gonna Give You Up (Official Music Video) [HD] [4K]';
    assert.equal(cleanTitle(raw), 'Never Gonna Give You Up');
  });

  it('cleans Asian brackets 【MV】 and CJK video markers', () => {
    const raw = '【MV】Blueming (Official Video)';
    assert.equal(cleanTitle(raw), 'Blueming');
  });

  it('cleans featuring info from title', () => {
    const raw = 'Fortnight (feat. Post Malone)';
    assert.equal(cleanTitle(raw), 'Fortnight');
  });

  it('extracts artist and title from "Artist - Title" format when artist is missing', () => {
    const metadata = sanitizeTrackMetadata({
      title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
      artist: '',
    });

    assert.equal(metadata.cleanArtist, 'Rick Astley');
    assert.equal(metadata.cleanTitle, 'Never Gonna Give You Up');
  });

  it('strips redundant artist from title if already provided', () => {
    const metadata = sanitizeTrackMetadata({
      title: 'Queen - Bohemian Rhapsody (Remastered 2021)',
      artist: 'Queen',
    });

    assert.equal(metadata.cleanArtist, 'Queen');
    assert.equal(metadata.cleanTitle, 'Bohemian Rhapsody');
  });

  it('cleans YouTube "- Topic" artist suffix', () => {
    assert.equal(cleanArtist('Daft Punk - Topic'), 'Daft Punk');
    assert.equal(cleanArtist('Taylor Swift VEVO'), 'Taylor Swift');
  });
});

describe('3. LRC Parser', () => {
  it('parses timestamps into seconds and milliseconds correctly', () => {
    const p1 = parseTimeToSeconds('01', '05', '50');
    assert.equal(p1.timeSec, 65.5);
    assert.equal(p1.timeMs, 65500);

    const p2 = parseTimeToSeconds('00', '12', '123');
    assert.equal(p2.timeSec, 12.123);
    assert.equal(p2.timeMs, 12123);
  });

  it('parses standard synced LRC lines', () => {
    const lrc = `
[00:10.00]First line
[00:15.50]Second line
[00:20.00]Third line
    `;

    const parsed = parseLrc(lrc);
    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 3);
    assert.equal(parsed.lines[0].time, 10.0);
    assert.equal(parsed.lines[0].text, 'First line');
    assert.equal(parsed.lines[1].time, 15.5);
    assert.equal(parsed.lines[1].text, 'Second line');
  });

  it('handles multi-timestamp lines [mm:ss.xx][mm:ss.xx]Text', () => {
    const lrc = `[00:10.00][00:30.00]Chorus line`;
    const parsed = parseLrc(lrc);

    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 2);
    assert.equal(parsed.lines[0].time, 10.0);
    assert.equal(parsed.lines[0].text, 'Chorus line');
    assert.equal(parsed.lines[1].time, 30.0);
    assert.equal(parsed.lines[1].text, 'Chorus line');
  });

  it('parses inline syllable tags <mm:ss.xx>word into words array', () => {
    const lrc = `[00:12.00]<00:12.00>Never <00:12.50>gonna <00:13.00>give <00:13.50>you <00:14.00>up`;
    const parsed = parseLrc(lrc);

    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 1);
    const line = parsed.lines[0];
    assert.equal(line.time, 12.0);
    assert.equal(line.text, 'Never gonna give you up');
    assert.ok(line.words);
    assert.equal(line.words.length, 5);
    assert.equal(line.words[0].text.trim(), 'Never');
    assert.equal(line.words[0].time, 12.0);
    assert.equal(line.words[1].text.trim(), 'gonna');
    assert.equal(line.words[1].time, 12.5);
    assert.equal(line.words[4].text.trim(), 'up');
    assert.equal(line.words[4].time, 14.0);
  });

  it('applies [offset:+/-ms] tag to all lines', () => {
    const lrc = `
[offset:500]
[00:10.00]Offset line
    `;
    const parsed = parseLrc(lrc);
    assert.equal(parsed.lines[0].time, 10.5);
    assert.equal(parsed.lines[0].timeMs, 10500);
  });

  it('falls back to unsynced plain lyrics when no timestamps exist', () => {
    const plain = `Line one\nLine two\nLine three`;
    const parsed = parseLrc(plain);
    assert.equal(parsed.synced, false);
    assert.equal(parsed.lines.length, 0);
    assert.equal(parsed.plainLyrics, 'Line one\nLine two\nLine three');
  });
});

describe('4. LRCLIB Provider', () => {
  it('calls exact match and parses synced lyrics', async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/get')) {
        return new Response(
          JSON.stringify({
            trackName: 'Test Song',
            artistName: 'Test Artist',
            duration: 200,
            syncedLyrics: '[00:05.00]Hello world\n[00:10.00]Second line',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const provider = new LrclibProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'vid1',
      title: 'Test Song',
      artist: 'Test Artist',
      durationSec: 200,
    });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.source, 'lrclib');
    assert.equal(result.lines.length, 2);
    assert.equal(result.lines[0].text, 'Hello world');
  });

  it('falls back to /api/search when exact match returns 404, matching within 4s duration', async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/get')) {
        return new Response('Not Found', { status: 404 });
      }
      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify([
            {
              trackName: 'Wrong Duration',
              artistName: 'Test Artist',
              duration: 300,
              syncedLyrics: '[00:01.00]Wrong',
            },
            {
              trackName: 'Matched Duration',
              artistName: 'Test Artist',
              duration: 202, // within 4s of 200
              syncedLyrics: '[00:05.00]Search matched line',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const provider = new LrclibProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'vid2',
      title: 'Matched Duration',
      artist: 'Test Artist',
      durationSec: 200,
    });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.lines[0].text, 'Search matched line');
  });

  it('handles instrumental tracks', async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          trackName: 'Instrumental Track',
          instrumental: true,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };

    const provider = new LrclibProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'vid3',
      title: 'Instrumental Track',
      artist: 'Artist',
    });

    assert.ok(result);
    assert.equal(result.synced, false);
    assert.equal(result.plainLyrics, '[Instrumental]');
  });
});

describe('5. InnerTube Provider', () => {
  it('parses YouTube player captions (timed-text json3)', async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/youtubei/v1/player')) {
        return new Response(
          JSON.stringify({
            captions: {
              playerCaptionsTracklistRenderer: {
                captionTracks: [
                  {
                    baseUrl: 'https://www.youtube.com/api/timedtext?v=test',
                    languageCode: 'en',
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (urlStr.includes('/api/timedtext')) {
        return new Response(
          JSON.stringify({
            events: [
              {
                tStartMs: 5000,
                dDurationMs: 2000,
                segs: [
                  { utf8: 'Hello ', tOffsetMs: 0 },
                  { utf8: 'world', tOffsetMs: 500 },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response('Not Found', { status: 404 });
    };

    const provider = new InnertubeProvider(mockFetch);
    const result = await provider.fetchLyrics({ videoId: 'tube1' });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.source, 'innertube');
    assert.equal(result.lines.length, 1);
    assert.equal(result.lines[0].time, 5);
    assert.equal(result.lines[0].text, 'Hello world');
    assert.equal(result.lines[0].words?.length, 2);
  });
});

describe('6. KuGou Provider', () => {
  it('searches, downloads, and decodes base64 LRC lyrics', async () => {
    const lrcText = '[00:08.50]KuGou Synced Line\n[00:15.00]Second Line';
    const base64Lrc = Buffer.from(lrcText, 'utf-8').toString('base64');

    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/search/song')) {
        return new Response(
          JSON.stringify({
            data: {
              info: [{ hash: 'HASH123', songname: 'Song', duration: 180 }],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (urlStr.includes('krcs.kugou.com/search')) {
        return new Response(
          JSON.stringify({
            candidates: [{ id: 9999, accesskey: 'ACCESSKEY123' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (urlStr.includes('krcs.kugou.com/download')) {
        return new Response(
          JSON.stringify({
            status: 200,
            content: base64Lrc,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response('Not Found', { status: 404 });
    };

    const provider = new KugouProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'kg1',
      title: 'Anime Song',
      artist: 'Anime Artist',
      durationSec: 180,
    });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.source, 'kugou');
    assert.equal(result.lines.length, 2);
    assert.equal(result.lines[0].text, 'KuGou Synced Line');
  });
});

describe('7. LyricsManager Orchestration (Cache -> DB -> Cascade)', () => {
  // In-memory cache mock
  const createMockCache = (): Cache & { store: Map<string, string> } => {
    const store = new Map<string, string>();
    return {
      store,
      get: async (k) => store.get(k) ?? null,
      set: async (k, v) => {
        store.set(k, v);
      },
    };
  };

  it('returns cached lyrics immediately without querying DB or providers', async () => {
    const cache = createMockCache();
    const cachedData: LyricsResult = {
      videoId: 'cache-hit',
      synced: true,
      lines: [{ time: 10, text: 'Cached line' }],
      source: 'lrclib',
    };
    await cache.set('lyrics:cache-hit', JSON.stringify(cachedData));

    let providerCalled = false;
    const mockProvider: LyricsProvider = {
      name: 'test',
      fetchLyrics: async () => {
        providerCalled = true;
        return null;
      },
    };

    const manager = new LyricsManager({
      cache,
      providers: [mockProvider],
    });

    const result = await manager.getLyrics({ videoId: 'cache-hit' });
    assert.equal(result.videoId, 'cache-hit');
    assert.equal(result.lines[0].text, 'Cached line');
    assert.equal(providerCalled, false);
  });

  it('cascades from Provider 1 to Provider 2 when Provider 1 fails, and persists to cache', async () => {
    const cache = createMockCache();

    const provider1: LyricsProvider = {
      name: 'p1',
      fetchLyrics: async () => null,
    };

    const provider2: LyricsProvider = {
      name: 'p2',
      fetchLyrics: async (q) => ({
        videoId: q.videoId,
        synced: true,
        lines: [{ time: 20, text: 'P2 Line' }],
        source: 'innertube',
      }),
    };

    const manager = new LyricsManager({
      cache,
      providers: [provider1, provider2],
    });

    const result = await manager.getLyrics({
      videoId: 'cascade-vid',
      title: 'Some Song',
      artist: 'Some Artist',
    });

    assert.equal(result.source, 'innertube');
    assert.equal(result.lines[0].text, 'P2 Line');

    // Verify cache was populated
    const saved = await cache.get('lyrics:cascade-vid');
    assert.ok(saved);
    const parsed = JSON.parse(saved);
    assert.equal(parsed.source, 'innertube');
  });

  it('returns fallback source=none when all providers fail', async () => {
    const cache = createMockCache();
    const failingProvider: LyricsProvider = {
      name: 'fail',
      fetchLyrics: async () => null,
    };

    const manager = new LyricsManager({
      cache,
      providers: [failingProvider],
    });

    const result = await manager.getLyrics({
      videoId: 'not-found-vid',
      title: 'Unknown',
    });

    assert.equal(result.source, 'none');
    assert.equal(result.synced, false);
    assert.equal(result.lines.length, 0);
  });

  it('reads from mock DB on cache miss and warms cache', async () => {
    const cache = createMockCache();
    const mockDbRow = {
      videoId: 'db-hit-vid',
      synced: true,
      syncedLyrics: [{ time: 5.5, text: 'DB Line' }],
      plainLyrics: 'DB Line',
      source: 'lrclib',
      updatedAt: new Date(),
    };

    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [mockDbRow],
          }),
        }),
      }),
    };

    const manager = new LyricsManager({
      cache,
      db: mockDb,
      providers: [],
    });

    const result = await manager.getLyrics({ videoId: 'db-hit-vid' });
    assert.equal(result.videoId, 'db-hit-vid');
    assert.equal(result.source, 'lrclib');
    assert.equal(result.lines[0].text, 'DB Line');

    // Check cache is warmed
    const cached = await cache.get('lyrics:db-hit-vid');
    assert.ok(cached);
    const parsed = JSON.parse(cached);
    assert.equal(parsed.lines[0].text, 'DB Line');
  });

  it('persists provider results into DB and warms cache', async () => {
    const cache = createMockCache();
    let insertedValue: any = null;

    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: (val: any) => {
          insertedValue = val;
          return {
            onConflictDoUpdate: async () => {},
          };
        },
      }),
    };

    const provider: LyricsProvider = {
      name: 'lrclib',
      fetchLyrics: async (q) => ({
        videoId: q.videoId,
        synced: true,
        lines: [{ time: 10, text: 'Persisted line' }],
        source: 'lrclib',
      }),
    };

    const manager = new LyricsManager({
      cache,
      db: mockDb,
      providers: [provider],
    });

    const result = await manager.getLyrics({
      videoId: 'save-to-db-vid',
      title: 'Persist Test',
    });

    assert.equal(result.lines[0].text, 'Persisted line');
    assert.ok(insertedValue);
    assert.equal(insertedValue.videoId, 'save-to-db-vid');
    assert.equal(insertedValue.source, 'lrclib');
  });
});

describe('8. Fastify Lyrics Route Handler', () => {
  it('returns 400 when videoId is missing', async () => {
    const fastifyModule = await import('fastify');
    const Fastify = fastifyModule.default;
    const { lyricsRoutes } = await import('../src/routes/lyrics.js');

    const app = Fastify();
    await app.register(lyricsRoutes, { prefix: '/api/lyrics' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/lyrics',
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'videoId_required');
    await app.close();
  });

  it('returns valid lyrics payload when videoId is present', async () => {
    const fastifyModule = await import('fastify');
    const Fastify = fastifyModule.default;
    const { lyricsRoutes } = await import('../src/routes/lyrics.js');

    const app = Fastify();
    await app.register(lyricsRoutes, { prefix: '/api/lyrics' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/lyrics?videoId=sample123&title=Test&artist=Sample',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    // Should conform to lyricsResponseSchema
    const parsed = lyricsResponseSchema.parse(body);
    assert.equal(parsed.videoId, 'sample123');
    assert.ok(parsed.source);
    await app.close();
  });
});
