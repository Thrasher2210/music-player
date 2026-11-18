import type { LyricsProvider, LyricsQuery, LyricsResult } from '../types.js';
import { parseLrc } from '../parser.js';

interface LrclibResponse {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export class LrclibProvider implements LyricsProvider {
  readonly name = 'lrclib';
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch ?? fetch;
  }

  async fetchLyrics(query: LyricsQuery): Promise<LyricsResult | null> {
    if (!query.title && !query.artist) {
      return null;
    }

    // 1. Try exact match: /api/get
    try {
      const exactResult = await this.fetchExact(query);
      if (exactResult) return exactResult;
    } catch {
      // Fallback to search
    }

    // 2. Try search: /api/search?q=...
    try {
      return await this.fetchSearch(query);
    } catch {
      return null;
    }
  }

  private async fetchExact(query: LyricsQuery): Promise<LyricsResult | null> {
    const params = new URLSearchParams();
    if (query.title) params.set('track_name', query.title);
    if (query.artist) params.set('artist_name', query.artist);
    if (query.durationSec !== undefined && query.durationSec > 0) {
      params.set('duration', Math.round(query.durationSec).toString());
    }

    const url = `https://lrclib.net/api/get?${params.toString()}`;
    const res = await this.fetchFn(url, {
      headers: {
        'User-Agent': 'MusicPlayer/1.0 (https://github.com/music-player)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as LrclibResponse;
    return this.formatResult(query.videoId, data);
  }

  private async fetchSearch(query: LyricsQuery): Promise<LyricsResult | null> {
    const qParts = [query.artist, query.title].filter(Boolean).join(' ');
    const params = new URLSearchParams({ q: qParts });

    const url = `https://lrclib.net/api/search?${params.toString()}`;
    const res = await this.fetchFn(url, {
      headers: {
        'User-Agent': 'MusicPlayer/1.0 (https://github.com/music-player)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return null;
    }

    const results = (await res.json()) as LrclibResponse[];
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    // Filter by duration matching (within 4s) if durationSec is specified
    let candidate: LrclibResponse | undefined;

    if (query.durationSec !== undefined && query.durationSec > 0) {
      const durationMatches = results.filter(
        (r) =>
          r.duration !== undefined &&
          Math.abs(r.duration - query.durationSec!) <= 4,
      );

      if (durationMatches.length > 0) {
        // Prefer candidate with syncedLyrics
        candidate =
          durationMatches.find((r) => Boolean(r.syncedLyrics)) ||
          durationMatches[0];
      }
    }

    if (!candidate) {
      // Pick first result with syncedLyrics, or first result overall
      candidate = results.find((r) => Boolean(r.syncedLyrics)) || results[0];
    }

    if (!candidate) return null;

    return this.formatResult(query.videoId, candidate);
  }

  private formatResult(videoId: string, data: LrclibResponse): LyricsResult | null {
    if (data.instrumental) {
      return {
        videoId,
        synced: false,
        lines: [],
        plainLyrics: '[Instrumental]',
        source: 'lrclib',
      };
    }

    if (data.syncedLyrics) {
      const parsed = parseLrc(data.syncedLyrics);
      return {
        videoId,
        synced: parsed.synced,
        lines: parsed.lines,
        plainLyrics: parsed.plainLyrics ?? data.plainLyrics,
        source: 'lrclib',
      };
    }

    if (data.plainLyrics) {
      return {
        videoId,
        synced: false,
        lines: [],
        plainLyrics: data.plainLyrics,
        source: 'lrclib',
      };
    }

    return null;
  }
}
