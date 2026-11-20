import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { lyricsResponseSchema } from '@mp/api-contract';
import { LyricsManager } from '../src/lyrics/manager.js';
import type { Cache } from '../src/cache.js';
import type { LyricsProvider, LyricsResult } from '../src/lyrics/types.js';

describe('7. LyricsManager Orchestration (Cache -> DB -> Cascade)', () => {
  const verifiedMetadata = {
    resolve: async () => ({ title: 'Some Song', artist: 'Some Artist' }),
  };

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
      metadataResolver: verifiedMetadata,
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
      metadataResolver: verifiedMetadata,
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
      metadataResolver: verifiedMetadata,
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
  after(async () => {
    const { closeDb } = await import('@mp/db');
    const { closeRedis } = await import('../src/redis.js');
    await closeDb();
    await closeRedis();
  });
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
      url: '/api/lyrics?videoId=sample12345&title=Test&artist=Sample',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    // Should conform to lyricsResponseSchema
    const parsed = lyricsResponseSchema.parse(body);
    assert.equal(parsed.videoId, 'sample12345');
    assert.ok(parsed.source);
    await app.close();
  });

  it('returns 400 when videoId is not a YouTube video id', async () => {
    const fastifyModule = await import('fastify');
    const Fastify = fastifyModule.default;
    const { lyricsRoutes } = await import('../src/routes/lyrics.js');

    const app = Fastify();
    await app.register(lyricsRoutes, { prefix: '/api/lyrics' });

    for (const videoId of ['short', 'has spaces!!', 'waytoolongvideoid', '../../etc/x']) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/lyrics?videoId=${encodeURIComponent(videoId)}`,
      });
      assert.equal(res.statusCode, 400, videoId);
      assert.equal(JSON.parse(res.payload).error, 'videoId_invalid');
    }

    const repeated = await app.inject({
      method: 'GET',
      url: '/api/lyrics?videoId=aaaaaaaaaaa&videoId=bbbbbbbbbbb',
    });
    assert.equal(repeated.statusCode, 400);
    assert.equal(JSON.parse(repeated.payload).error, 'videoId_invalid');
    await app.close();
  });
});
