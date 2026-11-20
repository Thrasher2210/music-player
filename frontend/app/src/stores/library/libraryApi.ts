import { type Track } from '@mp/player-core';
import { type Playlist, type PlayHistoryItem } from './types';
import {
  getGuestLikes,
  saveGuestLike,
  removeGuestLike,
  getGuestPlaylists,
  saveGuestPlaylist,
} from './guestStorage';

export interface LibraryFetchResult {
  likedTracks: Track[];
  likedVideoIds: Set<string>;
  playlists: Playlist[];
  history: PlayHistoryItem[];
}

export async function fetchLibraryData(): Promise<LibraryFetchResult> {
  const [likesRes, playlistsRes, historyRes] = await Promise.allSettled([
    fetch('/api/likes', { credentials: 'include' }),
    fetch('/api/playlists', { credentials: 'include' }),
    fetch('/api/history', { credentials: 'include' }),
  ]);

  let likedTracks: Track[] = [];
  const likedVideoIds = new Set<string>();
  if (likesRes.status === 'fulfilled' && likesRes.value.ok) {
    const data = await likesRes.value.json();
    if (Array.isArray(data.likes)) {
      likedTracks = data.likes.map((l: any): Track => ({
        id: l.videoId,
        videoId: l.videoId,
        title: l.title,
        artist: l.artist,
        duration: 0,
        thumbnail: l.albumArt || '',
      }));
      for (const l of data.likes) {
        likedVideoIds.add(l.videoId);
      }
    }
  } else {
    // Unauthenticated guest fallback
    likedTracks = getGuestLikes();
    for (const t of likedTracks) {
      const vid = t.videoId || t.id;
      if (vid) likedVideoIds.add(vid);
    }
  }

  let playlists: Playlist[] = [];
  if (playlistsRes.status === 'fulfilled' && playlistsRes.value.ok) {
    const data = await playlistsRes.value.json();
    if (Array.isArray(data.playlists)) {
      playlists = data.playlists.map((p: any): Playlist => ({
        id: p.id,
        name: p.name,
        source: p.source || 'local',
        trackCount: p.trackCount,
        coverArt: p.coverArt,
        ytPlaylistId: p.ytPlaylistId,
        createdAt: p.createdAt,
      }));
    }
  } else {
    // Unauthenticated guest fallback
    playlists = getGuestPlaylists();
  }

  let history: PlayHistoryItem[] = [];
  if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
    const data = await historyRes.value.json();
    if (Array.isArray(data.history)) {
      history = data.history.map((h: any): PlayHistoryItem => ({
        videoId: h.videoId,
        playedAt: h.playedAt,
        msPlayed: h.msPlayed ?? 0,
        title: h.title ?? null,
        artist: h.artist ?? null,
        albumArt: h.albumArt ?? null,
        durationSec: h.durationSec ?? null,
      }));
    }
  }

  return { likedTracks, likedVideoIds, playlists, history };
}

export async function likeTrackApi(track: Track): Promise<boolean> {
  const vid = track.videoId || track.id;
  try {
    const res = await fetch(`/api/likes/${encodeURIComponent(vid)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: track.title,
        artist: track.artist,
        albumArt: track.thumbnail || null,
      }),
    });
    if (res.status === 401) {
      saveGuestLike(track);
      return true;
    }
    return res.ok;
  } catch {
    saveGuestLike(track);
    return true;
  }
}

export async function unlikeTrackApi(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/likes/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.status === 401) {
      removeGuestLike(videoId);
      return true;
    }
    return res.ok;
  } catch {
    removeGuestLike(videoId);
    return true;
  }
}

export async function createPlaylistApi(
  name: string,
  extra?: { source?: 'local' | 'youtube'; ytPlaylistId?: string; coverArt?: string }
): Promise<Playlist | null> {
  if (!name.trim()) return null;
  try {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: name.trim(), ...extra }),
    });
    if (res.status === 401) {
      const guestPl: Playlist = {
        id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        source: extra?.source || 'local',
        trackCount: 0,
        coverArt: extra?.coverArt,
        ytPlaylistId: extra?.ytPlaylistId,
        createdAt: new Date().toISOString(),
      };
      saveGuestPlaylist(guestPl);
      return guestPl;
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.playlist) {
      return {
        id: data.playlist.id,
        name: data.playlist.name,
        source: data.playlist.source || 'local',
        trackCount: 0,
        coverArt: data.playlist.coverArt,
        ytPlaylistId: data.playlist.ytPlaylistId,
        createdAt: data.playlist.createdAt,
      };
    }
  } catch {
    const guestPl: Playlist = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      source: extra?.source || 'local',
      trackCount: 0,
      coverArt: extra?.coverArt,
      ytPlaylistId: extra?.ytPlaylistId,
      createdAt: new Date().toISOString(),
    };
    saveGuestPlaylist(guestPl);
    return guestPl;
  }
  return null;
}

export async function deletePlaylistApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/playlists/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.ok;
}

export async function addTracksToPlaylistApi(
  playlistId: string,
  tracks: Track[]
): Promise<boolean> {
  if (!tracks.length) return false;
  const payloadTracks = tracks.map((t) => ({
    videoId: t.videoId || t.id,
    title: t.title,
    artist: t.artist,
    albumArt: t.thumbnail || null,
    durationMs: (t.duration || 0) * 1000,
  }));

  const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tracks: payloadTracks }),
  });
  return res.ok;
}

export async function removeTrackFromPlaylistApi(
  playlistId: string,
  videoId: string
): Promise<boolean> {
  const res = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(videoId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  return res.ok;
}

const MAX_TEXT_LENGTH = 500;

/** Records a play and returns it as stored, or null when the server did not accept it (e.g. guests). */
export async function recordPlayHistoryApi(
  track: Track,
  msPlayed: number = 0
): Promise<PlayHistoryItem | null> {
  const videoId = track.videoId || track.id;
  if (!videoId) return null;

  const hasDetails = Boolean(track.title && track.artist);
  const details = hasDetails
    ? {
        title: track.title.slice(0, MAX_TEXT_LENGTH),
        artist: track.artist.slice(0, MAX_TEXT_LENGTH),
        albumArt: track.thumbnail || null,
        durationSec: track.duration > 0 ? Math.round(track.duration) : undefined,
      }
    : {};

  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videoId, msPlayed, ...details }),
    });
    if (!res.ok) return null;
    return {
      videoId,
      playedAt: new Date().toISOString(),
      msPlayed,
      title: details.title ?? null,
      artist: details.artist ?? null,
      albumArt: details.albumArt ?? null,
      durationSec: details.durationSec ?? null,
    };
  } catch (err) {
    console.debug('Failed to record history:', err);
    return null;
  }
}

export async function fetchPlaylistTracksApi(playlistId: string): Promise<Track[]> {
  const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data.tracks)) {
    return data.tracks.map((t: any): Track => ({
      id: t.videoId,
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      duration: Math.round((t.durationMs || 0) / 1000),
      thumbnail: t.albumArt || '',
    }));
  }
  return [];
}
