const SEGMENT_PATTERN = /^[A-Za-z0-9_]+$/;
const KEY_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * Builds the InnerTube endpoint (`player`, `music/get_search_suggestions`, ...)
 * from the catch-all route segments. Returns null unless every segment is a
 * plain identifier, which rules out `..`, encoded slashes, `?` and `#`.
 */
export function parseInnerTubeSubpath(segments: string[] | undefined): string | null {
  if (!segments?.length) return null;
  const parts =
    segments[0] === 'youtubei' && segments[1] === 'v1' ? segments.slice(2) : segments;
  if (!parts.length || !parts.every((part) => SEGMENT_PATTERN.test(part))) {
    return null;
  }
  return parts.join('/');
}

export function isValidInnerTubeKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}
