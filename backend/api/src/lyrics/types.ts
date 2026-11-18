export interface LyricsWord {
  time: number; // in seconds
  text: string;
}

export interface LyricLine {
  time: number; // in seconds
  timeMs?: number | null;
  text: string;
  words?: LyricsWord[];
}

export interface LyricsResult {
  videoId?: string;
  synced: boolean;
  lines: LyricLine[];
  plainLyrics?: string;
  source: 'lrclib' | 'innertube' | 'kugou' | 'db' | 'none' | string;
}

export interface LyricsQuery {
  videoId: string;
  title?: string;
  artist?: string;
  durationSec?: number;
}

export interface LyricsProvider {
  readonly name: string;
  fetchLyrics(query: LyricsQuery): Promise<LyricsResult | null>;
}
