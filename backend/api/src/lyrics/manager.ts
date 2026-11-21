import { eq } from 'drizzle-orm';
import { getDb, schema } from '@mp/db';
import { createCache, type Cache } from '../cache.js';
import type { LyricsProvider, LyricsQuery, LyricsResult, LyricLine } from './types.js';
import { sanitizeTrackMetadata } from './sanitizer.js';
import { LrclibProvider } from './providers/lrclib.js';
import { InnertubeProvider } from './providers/innertube.js';
import { KugouProvider } from './providers/kugou.js';
import {
  OembedMetadataResolver,
  type MetadataResolver,
  type VideoMetadata,
} from './metadata.js';

// Empty results are kept briefly so a provider outage, or lyrics that appear
// later, do not stay hidden for a full day.
export const NEGATIVE_CACHE_TTL_SECONDS = 5 * 60;

export interface LyricsManagerOptions {
  cache?: Cache;
  cacheTtl?: number; // default 24h (86400s)
  db?: ReturnType<typeof getDb>;
  providers?: LyricsProvider[];
  metadataResolver?: MetadataResolver;
}

export class LyricsManager {
  private cache: Cache;
  private cacheTtl: number;
  private customDb?: ReturnType<typeof getDb>;
  private providers: LyricsProvider[];
  private metadataResolver: MetadataResolver;

  constructor(options?: LyricsManagerOptions) {
    this.cache = options?.cache ?? createCache();
    this.cacheTtl = options?.cacheTtl ?? 24 * 60 * 60; // 24 hours
    this.customDb = options?.db;
    this.providers = options?.providers ?? [
      new LrclibProvider(),
      new InnertubeProvider(),
      new KugouProvider(),
    ];
    this.metadataResolver = options?.metadataResolver ?? new OembedMetadataResolver();
  }

  private async resolveVerifiedMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      return await this.metadataResolver.resolve(videoId);
    } catch (err) {
      console.warn('[lyrics-manager] Metadata lookup error:', err);
      return null;
    }
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

    // 3. Sanitize Query for Providers. Client supplied title/artist are only a
    // fallback: when the video can be verified its own metadata is used, and
    // only then may the result be stored for everyone else.
    const verified = await this.resolveVerifiedMetadata(query.videoId);
    const metadata = verified ?? { title: query.title, artist: query.artist };
    const sanitized = sanitizeTrackMetadata(metadata);

    const effectiveQuery: LyricsQuery = {
      videoId: query.videoId,
      title: sanitized.cleanTitle || metadata.title,
      artist: sanitized.cleanArtist || metadata.artist,
      durationSec: query.durationSec,
    };

    // 4. Providers Cascade: LRCLIB -> InnerTube -> KuGou
    let lyricsResult: LyricsResult | null = null;
    let failedProviders = 0;

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
        failedProviders++;
        console.warn(`[lyrics-manager] Provider ${provider.name} failed:`, err);
      }
    }

    const allProvidersFailed =
      !lyricsResult && this.providers.length > 0 && failedProviders === this.providers.length;

    // Fallback if no provider succeeded
    if (!lyricsResult) {
      lyricsResult = {
        videoId: query.videoId,
        synced: false,
        lines: [],
        source: 'none',
      };
    }

    // Nothing derived from unverified metadata or from a provider outage is stored
    if (!verified || allProvidersFailed) {
      return lyricsResult;
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
      const ttl = lyricsResult.source === 'none' ? NEGATIVE_CACHE_TTL_SECONDS : this.cacheTtl;
      await this.cache.set(cacheKey, JSON.stringify(lyricsResult), ttl);
    } catch (err) {
      console.warn('[lyrics-manager] Cache set error:', err);
    }

    return lyricsResult;
  }
}
