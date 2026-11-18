export interface SanitizedMetadata {
  title: string;
  artist: string;
  cleanTitle: string;
  cleanArtist: string;
  featArtist?: string;
}

const NOISE_PATTERNS: RegExp[] = [
  // Parenthesized/bracketed labels
  /\[\s*(?:official\s+)?(?:music\s+)?(?:video|audio|visualizer|lyric\s+video|lyrics|hd|4k|hq|remaster(?:ed)?|live|mv|pv|performance)\b[^\]]*\]/gi,
  /\(\s*(?:official\s+)?(?:music\s+)?(?:video|audio|visualizer|lyric\s+video|lyrics|hd|4k|hq|remaster(?:ed)?|live|mv|pv|performance)\b[^)]*\)/gi,
  // CJK brackets: 【...】, 「...」
  /[【「\[]\s*(?:official\s+)?(?:music\s+)?(?:video|audio|visualizer|lyric\s+video|lyrics|mv|pv|4k|hd)[^】」\]]*[】」\]]/gi,
  // Standalone quality/remaster tags
  /\b(?:4k|hd|hq|60fps)\b/gi,
  /\b(?:\d{4}\s+)?remaster(?:ed)?(?:\s+\d{4})?\b/gi,
  // (Lyrics), [Lyrics]
  /\(\s*lyrics\s*\)/gi,
  /\[\s*lyrics\s*\]/gi,
];

const FEAT_PATTERN = /(?:[([{\s](?:feat\.|ft\.|featuring)\s+([^()\]}]+)[)\]}]?)/i;

/**
 * Strips common YouTube video title noise:
 * - (Official Music Video), [HD], [4K], (Lyric Video), etc.
 */
export function cleanTitle(raw: string): string {
  if (!raw) return '';
  let cleaned = raw;

  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove feat. from title if present, keeping main title clean
  cleaned = cleaned.replace(FEAT_PATTERN, ' ');

  // Clean up punctuation artifacts: empty parens/brackets, dangling quotes/hyphens
  cleaned = cleaned
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/[【「】」]/g, ' ')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If ends with a dangling separator like " -", remove it
  cleaned = cleaned.replace(/[-–—|]\s*$/, '').trim();

  return cleaned;
}

/**
 * Cleans artist string (e.g. strips " - Topic", "Official", etc.)
 */
export function cleanArtist(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/\s*-\s*topic\b/i, '')
    .replace(/\s*vevo\b/i, '')
    .replace(/\s*official\b/i, '')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Sanitizes track title and artist, extracting from combined "Artist - Title" strings when needed.
 */
export function sanitizeTrackMetadata(input: {
  title?: string;
  artist?: string;
}): SanitizedMetadata {
  let rawTitle = input.title?.trim() || '';
  let rawArtist = input.artist?.trim() || '';

  // Extract featured artist if present
  let featArtist: string | undefined;
  const featMatch = rawTitle.match(FEAT_PATTERN) || rawArtist.match(FEAT_PATTERN);
  if (featMatch?.[1]) {
    featArtist = featMatch[1].trim();
  }

  // Check if title has "Artist - Title" format (using -, –, —, or |)
  const separatorMatch = rawTitle.match(/^(.*?)\s*[-–—|]\s*(.*)$/);
  if (separatorMatch) {
    const leftPart = separatorMatch[1].trim();
    const rightPart = separatorMatch[2].trim();

    // If artist is missing or generic (e.g. empty or "Various Artists" or "Topic")
    const isArtistEmptyOrGeneric =
      !rawArtist ||
      /^(various\s+artists|topic|unknown)$/i.test(rawArtist) ||
      rawArtist.toLowerCase().endsWith(' - topic');

    if (isArtistEmptyOrGeneric && leftPart && rightPart) {
      rawArtist = leftPart;
      rawTitle = rightPart;
    } else if (rawArtist && leftPart.toLowerCase() === rawArtist.toLowerCase()) {
      // Title starts with "Artist - ...", strip artist from title
      rawTitle = rightPart;
    }
  }

  const cleanedTitle = cleanTitle(rawTitle);
  const cleanedArtist = cleanArtist(rawArtist);

  return {
    title: rawTitle,
    artist: rawArtist,
    cleanTitle: cleanedTitle || rawTitle,
    cleanArtist: cleanedArtist || rawArtist,
    featArtist,
  };
}
