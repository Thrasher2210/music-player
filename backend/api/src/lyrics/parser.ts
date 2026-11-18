import type { LyricLine, LyricsWord } from './types.js';

const TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const METADATA_TAG_REGEX = /^\[([a-zA-Z]+):(.*)\]$/;
const SYLLABLE_TAG_REGEX = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;

export interface ParsedLrc {
  synced: boolean;
  lines: LyricLine[];
  plainLyrics?: string;
}

/**
 * Parses time components into seconds and milliseconds.
 */
export function parseTimeToSeconds(
  minutesStr: string,
  secondsStr: string,
  fractionStr?: string,
): { timeSec: number; timeMs: number } {
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);
  const frac = fractionStr
    ? Number(fractionStr) / Math.pow(10, fractionStr.length)
    : 0;

  const totalSec = minutes * 60 + seconds + frac;
  const timeMs = Math.round(totalSec * 1000);
  return { timeSec: Math.round(totalSec * 1000) / 1000, timeMs };
}

/**
 * Parses inline syllable/word tags like `<00:12.34>word` into LyricsWord array.
 */
function parseWords(textWithTags: string, lineTimeSec: number): LyricsWord[] | undefined {
  if (!textWithTags.includes('<')) {
    return undefined;
  }

  const words: LyricsWord[] = [];
  const parts = textWithTags.split(/(<(?:\d{1,2}):(?:\d{2})(?:\.(?:\d{1,3}))?>)/g);

  let currentTime = lineTimeSec;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const tagMatch = part.match(/^<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>$/);
    if (tagMatch) {
      const parsed = parseTimeToSeconds(tagMatch[1], tagMatch[2], tagMatch[3]);
      currentTime = parsed.timeSec;
    } else {
      const wordText = part;
      if (wordText.trim().length > 0) {
        words.push({
          time: currentTime,
          text: wordText,
        });
      }
    }
  }

  return words.length > 0 ? words : undefined;
}

/**
 * Robust LRC parser supporting:
 * - [mm:ss.xx] and [mm:ss.xxx] line tags
 * - Multiple timestamp tags per line (e.g. [01:23.45][01:30.60]Chorus)
 * - Syllable tags <mm:ss.xx>word into words array
 * - Offset tag [offset:+/-ms]
 * - Unsynced / plain text fallback
 */
export function parseLrc(lrcText: string): ParsedLrc {
  if (!lrcText || typeof lrcText !== 'string') {
    return { synced: false, lines: [] };
  }

  const rawLines = lrcText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const parsedLines: LyricLine[] = [];
  let offsetMs = 0;
  let hasTimestamp = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check for [offset:+/-ms]
    const metaMatch = trimmed.match(METADATA_TAG_REGEX);
    if (metaMatch) {
      const tagKey = metaMatch[1].toLowerCase();
      const tagValue = metaMatch[2].trim();
      if (tagKey === 'offset') {
        const parsedOffset = parseInt(tagValue, 10);
        if (!isNaN(parsedOffset)) {
          offsetMs = parsedOffset;
        }
      }
      // Skip other metadata tags like [ti:], [ar:], [al:]
      continue;
    }

    // Extract all line timestamps [mm:ss.xx]
    const timestamps: { timeSec: number; timeMs: number }[] = [];
    let match: RegExpExecArray | null;
    TIMESTAMP_REGEX.lastIndex = 0;

    while ((match = TIMESTAMP_REGEX.exec(trimmed)) !== null) {
      const parsed = parseTimeToSeconds(match[1], match[2], match[3]);
      timestamps.push(parsed);
    }

    if (timestamps.length === 0) {
      continue;
    }

    hasTimestamp = true;

    // Remaining text after stripping [mm:ss.xx] tags
    const textAfterTimestamps = trimmed.replace(TIMESTAMP_REGEX, '').trim();

    // Clean text by stripping inline syllable tags <mm:ss.xx>
    const cleanText = textAfterTimestamps.replace(SYLLABLE_TAG_REGEX, '').trim();

    for (const ts of timestamps) {
      const adjustedMs = Math.max(0, ts.timeMs + offsetMs);
      const adjustedSec = Math.max(0, Math.round(adjustedMs) / 1000);

      // Parse syllable words if present
      const words = parseWords(textAfterTimestamps, adjustedSec);

      parsedLines.push({
        time: adjustedSec,
        timeMs: adjustedMs,
        text: cleanText,
        ...(words ? { words } : {}),
      });
    }
  }

  if (!hasTimestamp || parsedLines.length === 0) {
    // Unsynced / plain text fallback
    const plainLyrics = rawLines
      .filter((l) => !METADATA_TAG_REGEX.test(l.trim()))
      .join('\n')
      .trim();

    return {
      synced: false,
      lines: [],
      plainLyrics: plainLyrics || undefined,
    };
  }

  // Sort lines ascending by time
  parsedLines.sort((a, b) => a.time - b.time);

  const plainLyrics = parsedLines
    .map((l) => l.text)
    .filter(Boolean)
    .join('\n');

  return {
    synced: true,
    lines: parsedLines,
    plainLyrics: plainLyrics || undefined,
  };
}
