import type { LyricsProvider, LyricsQuery, LyricsResult } from '../types.js';
import { parseLrc } from '../parser.js';

interface KugouSearchSongResponse {
  status?: number;
  data?: {
    info?: Array<{
      hash?: string;
      songname?: string;
      singername?: string;
      duration?: number; // duration in seconds
    }>;
  };
}

interface KugouLyricsSearchResponse {
  status?: number;
  candidates?: Array<{
    id?: string | number;
    accesskey?: string;
    duration?: number; // duration in ms
    song?: string;
    singer?: string;
  }>;
}

interface KugouLyricsDownloadResponse {
  status?: number;
  content?: string; // base64 encoded LRC
  fmt?: string;
}

export class KugouProvider implements LyricsProvider {
  readonly name = 'kugou';
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch ?? fetch;
  }

  async fetchLyrics(query: LyricsQuery): Promise<LyricsResult | null> {
    if (!query.title && !query.artist) {
      return null;
    }

    try {
      const keyword = [query.artist, query.title].filter(Boolean).join(' - ');

      // 1. Search song to obtain hash & duration
      const song = await this.searchSong(keyword, query.durationSec);
      if (!song?.hash) {
        return null;
      }

      const durationMs = (song.duration || query.durationSec || 0) * 1000;

      // 2. Search lyrics candidate by hash
      const candidate = await this.searchLyricsCandidate(
        song.hash,
        durationMs,
        keyword,
      );
      if (!candidate?.id || !candidate?.accesskey) {
        return null;
      }

      // 3. Download LRC lyrics
      const lrcContent = await this.downloadLyrics(
        String(candidate.id),
        candidate.accesskey,
      );
      if (!lrcContent) {
        return null;
      }

      // 4. Parse LRC
      const parsed = parseLrc(lrcContent);
      if (parsed.lines.length === 0 && !parsed.plainLyrics) {
        return null;
      }

      return {
        videoId: query.videoId,
        synced: parsed.synced,
        lines: parsed.lines,
        plainLyrics: parsed.plainLyrics,
        source: 'kugou',
      };
    } catch {
      return null;
    }
  }

  private async searchSong(
    keyword: string,
    durationSec?: number,
  ): Promise<{ hash: string; duration: number } | null> {
    const url = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(
      keyword,
    )}&page=1&pagesize=5`;

    const res = await this.fetchFn(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as KugouSearchSongResponse;
    const songs = data.data?.info;
    if (!songs || songs.length === 0) return null;

    if (durationSec !== undefined && durationSec > 0) {
      const matched = songs.find(
        (s) => s.duration !== undefined && Math.abs(s.duration - durationSec) <= 4,
      );
      if (matched?.hash) {
        return { hash: matched.hash, duration: matched.duration || durationSec };
      }
    }

    const first = songs[0];
    if (!first?.hash) return null;
    return { hash: first.hash, duration: first.duration || 0 };
  }

  private async searchLyricsCandidate(
    hash: string,
    durationMs: number,
    keyword: string,
  ): Promise<{ id: string | number; accesskey: string } | null> {
    const url = `http://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=&duration=${Math.round(
      durationMs,
    )}&hash=${hash}`;

    const res = await this.fetchFn(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as KugouLyricsSearchResponse;
    if (data.candidates && data.candidates.length > 0) {
      const cand = data.candidates[0];
      if (cand.id && cand.accesskey) {
        return { id: cand.id, accesskey: cand.accesskey };
      }
    }

    // Fallback: search by keyword if hash search failed
    const fallbackUrl = `http://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=${encodeURIComponent(
      keyword,
    )}&duration=${Math.round(durationMs)}&hash=`;

    const fallbackRes = await this.fetchFn(fallbackUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!fallbackRes.ok) return null;

    const fallbackData = (await fallbackRes.json()) as KugouLyricsSearchResponse;
    if (fallbackData.candidates && fallbackData.candidates.length > 0) {
      const cand = fallbackData.candidates[0];
      if (cand.id && cand.accesskey) {
        return { id: cand.id, accesskey: cand.accesskey };
      }
    }

    return null;
  }

  private async downloadLyrics(
    id: string,
    accesskey: string,
  ): Promise<string | null> {
    const url = `http://krcs.kugou.com/download?ver=1&client=mobi&id=${id}&accesskey=${accesskey}&fmt=lrc&charset=utf8`;

    const res = await this.fetchFn(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as KugouLyricsDownloadResponse;
    if (!data.content) return null;

    try {
      const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
      return decoded;
    } catch {
      return null;
    }
  }
}
