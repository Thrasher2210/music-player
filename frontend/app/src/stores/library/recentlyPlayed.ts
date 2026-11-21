import type { Track } from '@mp/player-core';
import type { PlayHistoryItem } from './types';

export const RECENTLY_PLAYED_LIMIT = 20;

/**
 * Collapses play history to one track per video, most recently played first.
 * Plays recorded without a title and artist cannot be shown and are skipped.
 */
export function toRecentlyPlayed(
  history: PlayHistoryItem[],
  limit: number = RECENTLY_PLAYED_LIMIT
): Track[] {
  const newestFirst = [...history].sort(
    (a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)
  );

  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const item of newestFirst) {
    if (tracks.length >= limit) break;
    if (!item.title || !item.artist || seen.has(item.videoId)) continue;
    seen.add(item.videoId);
    tracks.push({
      id: item.videoId,
      videoId: item.videoId,
      title: item.title,
      artist: item.artist,
      duration: item.durationSec ?? 0,
      thumbnail: item.albumArt ?? '',
    });
  }
  return tracks;
}
