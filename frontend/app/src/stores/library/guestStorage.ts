import type { Track } from '@mp/player-core';
import type { Playlist } from './types';

const GUEST_LIKES_KEY = 'mp_guest_likes';
const GUEST_PLAYLISTS_KEY = 'mp_guest_playlists';
const GUEST_PLAYLIST_TRACKS_KEY = 'mp_guest_playlist_tracks';
const GUEST_PLAYLIST_PREFIX = 'guest-';

/** A playlist stored locally. `serverId` is set once it was created on the server during migration. */
export interface GuestPlaylist extends Playlist {
  serverId?: string;
}

type TracksByPlaylist = Record<string, Track[]>;

function readJson<T>(key: string, fallback: T, isValid: (value: unknown) => boolean): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: guest data is best effort
  }
}

const readArray = <T>(key: string): T[] => readJson<T[]>(key, [], Array.isArray);

const readTracksByPlaylist = (): TracksByPlaylist =>
  readJson<TracksByPlaylist>(
    GUEST_PLAYLIST_TRACKS_KEY,
    {},
    (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
  );

const trackId = (t: Track): string => t.videoId || t.id;

export function isGuestPlaylistId(id: string): boolean {
  return id.startsWith(GUEST_PLAYLIST_PREFIX);
}

export function getGuestLikes(): Track[] {
  return readArray<Track>(GUEST_LIKES_KEY);
}

export function saveGuestLike(track: Track): void {
  const current = getGuestLikes();
  const vid = trackId(track);
  if (!current.some((t) => trackId(t) === vid)) {
    writeJson(GUEST_LIKES_KEY, [track, ...current]);
  }
}

export function removeGuestLike(videoId: string): void {
  writeJson(
    GUEST_LIKES_KEY,
    getGuestLikes().filter((t) => trackId(t) !== videoId)
  );
}

/** Guest playlists with `trackCount` derived from the stored tracks. */
export function getGuestPlaylists(): GuestPlaylist[] {
  const tracks = readTracksByPlaylist();
  return readArray<GuestPlaylist>(GUEST_PLAYLISTS_KEY).map((p) => ({
    ...p,
    trackCount: tracks[p.id]?.length ?? 0,
  }));
}

export function saveGuestPlaylist(pl: GuestPlaylist): void {
  const others = readArray<GuestPlaylist>(GUEST_PLAYLISTS_KEY).filter((p) => p.id !== pl.id);
  writeJson(GUEST_PLAYLISTS_KEY, [pl, ...others]);
}

export function createGuestPlaylist(
  name: string,
  extra?: { source?: 'local' | 'youtube'; ytPlaylistId?: string; coverArt?: string }
): Playlist {
  const playlist: Playlist = {
    id: `${GUEST_PLAYLIST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    source: extra?.source || 'local',
    trackCount: 0,
    coverArt: extra?.coverArt,
    ytPlaylistId: extra?.ytPlaylistId,
    createdAt: new Date().toISOString(),
  };
  saveGuestPlaylist(playlist);
  return playlist;
}

export function setGuestPlaylistServerId(id: string, serverId: string): void {
  const playlist = readArray<GuestPlaylist>(GUEST_PLAYLISTS_KEY).find((p) => p.id === id);
  if (playlist) saveGuestPlaylist({ ...playlist, serverId });
}

export function removeGuestPlaylist(id: string): void {
  writeJson(
    GUEST_PLAYLISTS_KEY,
    readArray<GuestPlaylist>(GUEST_PLAYLISTS_KEY).filter((p) => p.id !== id)
  );
  const tracks = readTracksByPlaylist();
  delete tracks[id];
  writeJson(GUEST_PLAYLIST_TRACKS_KEY, tracks);
}

export function getGuestPlaylistTracks(playlistId: string): Track[] {
  return readTracksByPlaylist()[playlistId] ?? [];
}

/**
 * Appends tracks that are not in the playlist yet (same rule as the server).
 * Returns how many were added, or null if the playlist does not exist.
 */
export function addGuestPlaylistTracks(playlistId: string, tracks: Track[]): number | null {
  const exists = readArray<GuestPlaylist>(GUEST_PLAYLISTS_KEY).some((p) => p.id === playlistId);
  if (!exists) return null;

  const all = readTracksByPlaylist();
  const current = all[playlistId] ?? [];
  const seen = new Set(current.map(trackId));
  const fresh: Track[] = [];
  for (const t of tracks) {
    if (!seen.has(trackId(t))) {
      seen.add(trackId(t));
      fresh.push(t);
    }
  }
  if (fresh.length > 0) {
    writeJson(GUEST_PLAYLIST_TRACKS_KEY, { ...all, [playlistId]: [...current, ...fresh] });
  }
  return fresh.length;
}

/** Returns true if the track was in the playlist. */
export function removeGuestPlaylistTrack(playlistId: string, videoId: string): boolean {
  const all = readTracksByPlaylist();
  const current = all[playlistId] ?? [];
  const next = current.filter((t) => trackId(t) !== videoId);
  if (next.length === current.length) return false;
  writeJson(GUEST_PLAYLIST_TRACKS_KEY, { ...all, [playlistId]: next });
  return true;
}
