import type { Track } from '@mp/player-core';
import { addTracksToPlaylistApi } from './libraryApi';
import {
  getGuestLikes,
  removeGuestLike,
  getGuestPlaylists,
  getGuestPlaylistTracks,
  removeGuestPlaylist,
  setGuestPlaylistServerId,
  type GuestPlaylist,
} from './guestStorage';

export interface GuestMigrationResult {
  likes: number;
  playlists: number;
}

async function migrateLike(track: Track): Promise<boolean> {
  const videoId = track.videoId || track.id;
  if (!videoId) return false;
  try {
    const res = await fetch(`/api/likes/${encodeURIComponent(videoId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        albumArt: track.thumbnail || null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function createServerPlaylist(pl: GuestPlaylist): Promise<string | null> {
  const res = await fetch('/api/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: pl.name,
      source: pl.source === 'youtube' ? 'youtube' : 'local',
      ytPlaylistId: pl.ytPlaylistId,
      coverArt: pl.coverArt,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return typeof data?.playlist?.id === 'string' ? data.playlist.id : null;
}

async function migratePlaylist(pl: GuestPlaylist): Promise<boolean> {
  try {
    let serverId = pl.serverId ?? null;
    if (!serverId) {
      serverId = await createServerPlaylist(pl);
      if (!serverId) return false;
      // Remember it so a retry after a failed track upload does not create a second playlist
      setGuestPlaylistServerId(pl.id, serverId);
    }
    const tracks = getGuestPlaylistTracks(pl.id);
    if (tracks.length > 0 && (await addTracksToPlaylistApi(serverId, tracks)) === null) {
      return false;
    }
    removeGuestPlaylist(pl.id);
    return true;
  } catch {
    return false;
  }
}

async function runMigration(): Promise<GuestMigrationResult> {
  const result: GuestMigrationResult = { likes: 0, playlists: 0 };

  for (const track of getGuestLikes()) {
    if (await migrateLike(track)) {
      removeGuestLike(track.videoId || track.id);
      result.likes++;
    }
  }

  for (const playlist of getGuestPlaylists()) {
    if (await migratePlaylist(playlist)) result.playlists++;
  }

  return result;
}

let inFlight: Promise<GuestMigrationResult> | null = null;

/**
 * Uploads likes and playlists saved while browsing as a guest to the signed in account.
 * Only items the server accepted are removed from localStorage, the rest stay for the next run.
 * Concurrent calls share one run.
 */
export function migrateGuestData(): Promise<GuestMigrationResult> {
  inFlight ??= runMigration().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
