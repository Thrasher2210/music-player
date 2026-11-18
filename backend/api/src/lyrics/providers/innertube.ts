import type { LyricLine, LyricsProvider, LyricsQuery, LyricsResult, LyricsWord } from '../types.js';

interface TimedTextSegment {
  utf8?: string;
  tOffsetMs?: number;
}

interface TimedTextEvent {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: TimedTextSegment[];
}

interface TimedTextResponse {
  events?: TimedTextEvent[];
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl: string;
        languageCode?: string;
        vssId?: string;
      }>;
    };
  };
}

export class InnertubeProvider implements LyricsProvider {
  readonly name = 'innertube';
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch ?? fetch;
  }

  async fetchLyrics(query: LyricsQuery): Promise<LyricsResult | null> {
    if (!query.videoId) {
      return null;
    }

    // 1. Try YouTube timed-text (captions)
    try {
      const timedResult = await this.fetchTimedText(query.videoId);
      if (timedResult && timedResult.lines.length > 0) {
        return timedResult;
      }
    } catch {
      // Fall through to YouTube Music lyrics tab
    }

    // 2. Try YouTube Music lyrics tab
    try {
      return await this.fetchMusicLyricsTab(query.videoId);
    } catch {
      return null;
    }
  }

  /**
   * Fetches timed text / captions via YouTube Player API.
   */
  private async fetchTimedText(videoId: string): Promise<LyricsResult | null> {
    const playerUrl = 'https://www.youtube.com/youtubei/v1/player';
    const playerRes = await this.fetchFn(playerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.09.37',
            hl: 'en',
            gl: 'US',
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!playerRes.ok) {
      return null;
    }

    const playerData = (await playerRes.json()) as PlayerResponse;
    const tracks =
      playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return null;
    }

    // Prefer English caption track if available, else first track
    const selectedTrack =
      tracks.find(
        (t) =>
          t.languageCode === 'en' ||
          (t.vssId && t.vssId.toLowerCase().includes('en')),
      ) || tracks[0];

    if (!selectedTrack?.baseUrl) {
      return null;
    }

    // Request json3 format for structured segments and timestamps
    const timedUrl = `${selectedTrack.baseUrl}&fmt=json3`;
    const timedRes = await this.fetchFn(timedUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!timedRes.ok) {
      return null;
    }

    const timedData = (await timedRes.json()) as TimedTextResponse;
    if (!timedData.events || timedData.events.length === 0) {
      return null;
    }

    const lines: LyricLine[] = [];

    for (const ev of timedData.events) {
      if (ev.tStartMs === undefined || !ev.segs || ev.segs.length === 0) {
        continue;
      }

      const text = ev.segs
        .map((s) => s.utf8 || '')
        .join('')
        .replace(/\n/g, ' ')
        .trim();

      if (!text) continue;

      const timeSec = Math.round(ev.tStartMs) / 1000;
      const timeMs = ev.tStartMs;

      let words: LyricsWord[] | undefined;
      if (ev.segs.length > 1) {
        words = [];
        for (const seg of ev.segs) {
          const segText = seg.utf8?.replace(/\n/g, ' ') || '';
          if (!segText.trim()) continue;
          const wordTimeSec =
            Math.round(ev.tStartMs + (seg.tOffsetMs || 0)) / 1000;
          words.push({
            time: wordTimeSec,
            text: segText,
          });
        }
        if (words.length === 0) words = undefined;
      }

      lines.push({
        time: timeSec,
        timeMs,
        text,
        ...(words ? { words } : {}),
      });
    }

    if (lines.length === 0) {
      return null;
    }

    const plainLyrics = lines.map((l) => l.text).join('\n');

    return {
      videoId,
      synced: true,
      lines,
      plainLyrics,
      source: 'innertube',
    };
  }

  /**
   * Fetches plain lyrics from YouTube Music browse endpoint.
   */
  private async fetchMusicLyricsTab(videoId: string): Promise<LyricsResult | null> {
    const nextUrl = 'https://music.youtube.com/youtubei/v1/next';
    const nextRes = await this.fetchFn(nextUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!nextRes.ok) return null;

    const nextData = await nextRes.json() as any;
    // Walk tabs to find lyrics browse ID
    const tabs =
      nextData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabRenderer
        ?.tabs ||
      nextData?.tabs ||
      [];

    let lyricsBrowseId: string | undefined;
    for (const tab of tabs) {
      const tabRenderer = tab.tabRenderer;
      if (
        tabRenderer?.title?.toLowerCase?.() === 'lyrics' ||
        tabRenderer?.endpoint?.browseEndpoint?.browseId
      ) {
        if (tabRenderer?.endpoint?.browseEndpoint?.browseId?.startsWith('MPLY')) {
          lyricsBrowseId = tabRenderer.endpoint.browseEndpoint.browseId;
          break;
        }
      }
    }

    if (!lyricsBrowseId) {
      return null;
    }

    const browseUrl = 'https://music.youtube.com/youtubei/v1/browse';
    const browseRes = await this.fetchFn(browseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        browseId: lyricsBrowseId,
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!browseRes.ok) return null;

    const browseData = await browseRes.json() as any;
    const runs =
      browseData?.contents?.sectionListRenderer?.contents?.[0]
        ?.musicDescriptionShelfRenderer?.description?.runs;

    if (Array.isArray(runs) && runs.length > 0) {
      const plainLyrics = runs.map((r: any) => r.text || '').join('').trim();
      if (plainLyrics) {
        return {
          videoId,
          synced: false,
          lines: [],
          plainLyrics,
          source: 'innertube',
        };
      }
    }

    return null;
  }
}
