/** Parse "3:45" or "1:02:03" into seconds. Returns 0 when the text is not a clock time. */
export function parseDuration(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}
