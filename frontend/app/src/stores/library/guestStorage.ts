import { Track } from '@mp/player-core';
import { Playlist } from './types';

const GUEST_LIKES_KEY = 'mp_guest_likes';
const GUEST_PLAYLISTS_KEY = 'mp_guest_playlists';

export function getGuestLikes(): Track[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_LIKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestLike(track: Track): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getGuestLikes();
    const vid = track.videoId || track.id;
    if (!current.some((t) => (t.videoId || t.id) === vid)) {
      localStorage.setItem(GUEST_LIKES_KEY, JSON.stringify([track, ...current]));
    }
  } catch {
    // Ignore
  }
}

export function removeGuestLike(videoId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getGuestLikes().filter((t) => (t.videoId || t.id) !== videoId);
    localStorage.setItem(GUEST_LIKES_KEY, JSON.stringify(current));
  } catch {
    // Ignore
  }
}

export function getGuestPlaylists(): Playlist[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_PLAYLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestPlaylist(pl: Playlist): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getGuestPlaylists();
    localStorage.setItem(GUEST_PLAYLISTS_KEY, JSON.stringify([pl, ...current.filter((p) => p.id !== pl.id)]));
  } catch {
    // Ignore
  }
}
