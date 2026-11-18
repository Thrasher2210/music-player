import { eq } from 'drizzle-orm';
import { getDb, schema } from '@mp/db';
import { createCache, type Cache } from '../cache.js';
import type { LyricsProvider, LyricsQuery, LyricsResult, LyricLine } from './types.js';
import { sanitizeTrackMetadata } from './sanitizer.js';
import { LrclibProvider } from './providers/lrclib.js';
import { InnertubeProvider } from './providers/innertube.js';
import { KugouProvider } from './providers/kugou.js';

export interface LyricsManagerOptions {
  cache?: Cache;
  cacheTtl?: number; // default 24h (86400s)
  db?: ReturnType<typeof getDb>;
  providers?: LyricsProvider[];
}

export class LyricsManager {
  private cache: Cache;
  private cacheTtl: number;
  private customDb?: ReturnType<typeof getDb>;
  private providers: LyricsProvider[];

  constructor(options?: LyricsManagerOptions) {
    this.cache = options?.cache ?? createCache();
    this.cacheTtl = options?.cacheTtl ?? 24 * 60 * 60; // 24 hours
    this.customDb = options?.db;
    this.providers = options?.providers ?? [
      new LrclibProvider(),
      new InnertubeProvider(),
      new KugouProvider(),
    ];
  }

  private getDbInstance(): ReturnType<typeof getDb> | null {
    if (this.customDb) return this.customDb;
    try {
      return getDb();
    } catch {
      return null;
    }
  }

  async getLyrics(query: LyricsQuery): Promise<LyricsResult> {
    if (!query.videoId) {
      throw new Error('videoId is required');
    }

    const cacheKey = `lyrics:${query.videoId}`;

    // 1. Check Redis Cache
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as LyricsResult;
        return {
          ...parsed,
          videoId: query.videoId,
        };
      }
    } catch (err) {
      console.warn('[lyrics-manager] Cache get error:', err);
    }

    // 2. Check Postgres DB
    try {
      const db = this.getDbInstance();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.lyrics)
          .where(eq(schema.lyrics.videoId, query.videoId))
          .limit(1);

        if (row) {
          const result: LyricsResult = {
            videoId: row.videoId,
            synced: row.synced,
            lines: (row.syncedLyrics as LyricLine[]) || [],
            plainLyrics: row.plainLyrics ?? undefined,
            source: row.source || 'db',
          };

          // Populate cache
          await this.cache.set(cacheKey, JSON.stringify(result), this.cacheTtl);
          return result;
        }
      }
    } catch (err) {
      console.warn('[lyrics-manager] DB fetch error:', err);
    }

    // 3. Sanitize Query for Providers
    const sanitized = sanitizeTrackMetadata({
      title: query.title,
      artist: query.artist,
    });

    const effectiveQuery: LyricsQuery = {
      videoId: query.videoId,
      title: sanitized.cleanTitle || query.title,
      artist: sanitized.cleanArtist || query.artist,
      durationSec: query.durationSec,
    };

    // 4. Providers Cascade: LRCLIB -> InnerTube -> KuGou
    let lyricsResult: LyricsResult | null = null;

    for (const provider of this.providers) {
      try {
        const res = await provider.fetchLyrics(effectiveQuery);
        if (res && (res.lines.length > 0 || Boolean(res.plainLyrics))) {
          lyricsResult = {
            ...res,
            videoId: query.videoId,
          };
          break;
        }
      } catch (err) {
        console.warn(`[lyrics-manager] Provider ${provider.name} failed:`, err);
      }
    }

    // Fallback if no provider succeeded
    if (!lyricsResult) {
      lyricsResult = {
        videoId: query.videoId,
        synced: false,
        lines: [],
        source: 'none',
      };
    }

    // 5. Persist in DB and Cache
    if (lyricsResult.source !== 'none') {
      try {
        const db = this.getDbInstance();
        if (db) {
          await db
            .insert(schema.lyrics)
            .values({
              videoId: query.videoId,
              plainLyrics: lyricsResult.plainLyrics ?? null,
              syncedLyrics: lyricsResult.lines,
              source: lyricsResult.source,
              synced: lyricsResult.synced,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: schema.lyrics.videoId,
              set: {
                plainLyrics: lyricsResult.plainLyrics ?? null,
                syncedLyrics: lyricsResult.lines,
                source: lyricsResult.source,
                synced: lyricsResult.synced,
                updatedAt: new Date(),
              },
            });
        }
      } catch (err) {
        console.warn('[lyrics-manager] DB persist error:', err);
      }
    }

    try {
      await this.cache.set(cacheKey, JSON.stringify(lyricsResult), this.cacheTtl);
    } catch (err) {
      console.warn('[lyrics-manager] Cache set error:', err);
    }

    return lyricsResult;
  }
}
