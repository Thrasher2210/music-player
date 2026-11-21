import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LyricsManager, NEGATIVE_CACHE_TTL_SECONDS } from '../src/lyrics/manager.js';
import type { Cache } from '../src/cache.js';
import type { LyricsProvider, LyricsQuery } from '../src/lyrics/types.js';

const VIDEO_ID = 'fJ9rUzIMcZQ';
const DAY = 24 * 60 * 60;

function createRecordingCache() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  const cache: Cache = {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value, ttl) => {
      store.set(key, value);
      ttls.set(key, ttl);
    },
  };
  return { cache, store, ttls };
}

function createRecordingDb() {
  const inserts: any[] = [];
  const db: any = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({
      values: (value: any) => {
        inserts.push(value);
        return { onConflictDoUpdate: async () => {} };
      },
    }),
  };
  return { db, inserts };
}

const resolverFor = (title: string, artist: string) => ({
  resolve: async () => ({ title, artist }),
});
const unverifiedResolver = { resolve: async () => null };

function echoProvider(queries: LyricsQuery[] = []): LyricsProvider {
  return {
    name: 'echo',
    fetchLyrics: async (q) => {
      queries.push(q);
      return {
        videoId: q.videoId,
        synced: false,
        lines: [],
        plainLyrics: `lyrics of ${q.title} by ${q.artist}`,
        source: 'lrclib',
      };
    },
  };
}

const throwingProvider = (name: string): LyricsProvider => ({
  name,
  fetchLyrics: async () => {
    throw new Error('network down');
  },
});

const emptyProvider: LyricsProvider = { name: 'empty', fetchLyrics: async () => null };

describe('9. Lyrics cache poisoning', () => {
  it('looks lyrics up with the verified metadata, not the client supplied title/artist', async () => {
    const { cache, store } = createRecordingCache();
    const { db, inserts } = createRecordingDb();
    const queries: LyricsQuery[] = [];

    const manager = new LyricsManager({
      cache,
      db,
      providers: [echoProvider(queries)],
      metadataResolver: resolverFor('Bohemian Rhapsody (Official Video)', 'Queen - Topic'),
    });

    const result = await manager.getLyrics({
      videoId: VIDEO_ID,
      title: 'Totally Wrong',
      artist: 'Nobody',
    });

    assert.equal(queries.length, 1);
    assert.equal(queries[0].title, 'Bohemian Rhapsody');
    assert.equal(queries[0].artist, 'Queen');
    assert.equal(result.plainLyrics, 'lyrics of Bohemian Rhapsody by Queen');

    const cached = JSON.parse(store.get(`lyrics:${VIDEO_ID}`)!);
    assert.equal(cached.plainLyrics, 'lyrics of Bohemian Rhapsody by Queen');
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].plainLyrics, 'lyrics of Bohemian Rhapsody by Queen');
  });

  it('a later request with different client metadata cannot replace the stored lyrics', async () => {
    const { cache } = createRecordingCache();
    const queries: LyricsQuery[] = [];
    const manager = new LyricsManager({
      cache,
      db: createRecordingDb().db,
      providers: [echoProvider(queries)],
      metadataResolver: resolverFor('Bohemian Rhapsody', 'Queen'),
    });

    await manager.getLyrics({ videoId: VIDEO_ID, title: 'Spam', artist: 'Spammer' });
    const second = await manager.getLyrics({ videoId: VIDEO_ID, title: 'Other', artist: 'Other' });

    assert.equal(queries.length, 1);
    assert.equal(second.plainLyrics, 'lyrics of Bohemian Rhapsody by Queen');
  });

  it('answers with client metadata but stores nothing when the video cannot be verified', async () => {
    const { cache, store } = createRecordingCache();
    const { db, inserts } = createRecordingDb();

    const manager = new LyricsManager({
      cache,
      db,
      providers: [echoProvider()],
      metadataResolver: unverifiedResolver,
    });

    const result = await manager.getLyrics({
      videoId: VIDEO_ID,
      title: 'Totally Wrong',
      artist: 'Nobody',
    });

    assert.equal(result.plainLyrics, 'lyrics of Totally Wrong by Nobody');
    assert.equal(store.size, 0);
    assert.equal(inserts.length, 0);
  });

  it('treats a resolver failure as unverified', async () => {
    const { cache, store } = createRecordingCache();
    const { db, inserts } = createRecordingDb();

    const manager = new LyricsManager({
      cache,
      db,
      providers: [echoProvider()],
      metadataResolver: {
        resolve: async () => {
          throw new Error('boom');
        },
      },
    });

    const result = await manager.getLyrics({ videoId: VIDEO_ID, title: 'T', artist: 'A' });

    assert.equal(result.source, 'lrclib');
    assert.equal(store.size, 0);
    assert.equal(inserts.length, 0);
  });

  it('does not cache anything when every provider throws', async () => {
    const { cache, store } = createRecordingCache();
    const { db, inserts } = createRecordingDb();

    const manager = new LyricsManager({
      cache,
      db,
      providers: [throwingProvider('a'), throwingProvider('b')],
      metadataResolver: resolverFor('Bohemian Rhapsody', 'Queen'),
    });

    const result = await manager.getLyrics({ videoId: VIDEO_ID });

    assert.equal(result.source, 'none');
    assert.equal(store.size, 0);
    assert.equal(inserts.length, 0);
  });

  it('caches an empty result only briefly and never writes it to the DB', async () => {
    const { cache, store, ttls } = createRecordingCache();
    const { db, inserts } = createRecordingDb();

    const manager = new LyricsManager({
      cache,
      db,
      providers: [emptyProvider, throwingProvider('flaky')],
      metadataResolver: resolverFor('Obscure Song', 'Nobody Famous'),
    });

    const result = await manager.getLyrics({ videoId: VIDEO_ID });

    assert.equal(result.source, 'none');
    const key = `lyrics:${VIDEO_ID}`;
    assert.ok(store.has(key));
    assert.equal(ttls.get(key), NEGATIVE_CACHE_TTL_SECONDS);
    assert.ok(NEGATIVE_CACHE_TTL_SECONDS <= 15 * 60);
    assert.equal(inserts.length, 0);
  });

  it('keeps found lyrics for the full ttl', async () => {
    const { cache, ttls } = createRecordingCache();

    const manager = new LyricsManager({
      cache,
      db: createRecordingDb().db,
      providers: [echoProvider()],
      metadataResolver: resolverFor('Bohemian Rhapsody', 'Queen'),
    });

    await manager.getLyrics({ videoId: VIDEO_ID });

    assert.equal(ttls.get(`lyrics:${VIDEO_ID}`), DAY);
  });
});
