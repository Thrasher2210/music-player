'use client';

import { create } from 'zustand';
import { type Track } from '@mp/player-core';

export interface Playlist {
  id: string;
  name: string;
  source: string;
  trackCount?: number;
  createdAt: string;
}

export interface PlayHistoryItem {
  videoId: string;
  playedAt: string;
  msPlayed: number;
}

export interface LibraryState {
  likedVideoIds: Set<string>;
  likedTracks: Track[];
  playlists: Playlist[];
  history: PlayHistoryItem[];
  isLoading: boolean;

  // Actions
  fetchLibrary: () => Promise<void>;
  toggleLike: (track: Track) => Promise<void>;
  isLiked: (videoId: string) => boolean;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<boolean>;
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => Promise<boolean>;
  recordPlayHistory: (videoId: string, msPlayed?: number) => Promise<void>;
  fetchPlaylistTracks: (playlistId: string) => Promise<Track[]>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  likedVideoIds: new Set<string>(),
  likedTracks: [],
  playlists: [],
  history: [],
  isLoading: false,

  fetchLibrary: async () => {
    set({ isLoading: true });
    try {
      const [likesRes, playlistsRes, historyRes] = await Promise.allSettled([
        fetch('/api/likes', { credentials: 'include' }),
        fetch('/api/playlists', { credentials: 'include' }),
        fetch('/api/history', { credentials: 'include' }),
      ]);

      let newLikedTracks: Track[] = [];
      const newLikedVideoIds = new Set<string>();
      if (likesRes.status === 'fulfilled' && likesRes.value.ok) {
        const data = await likesRes.value.json();
        if (Array.isArray(data.likes)) {
          newLikedTracks = data.likes.map((l: any): Track => ({
            id: l.videoId,
            videoId: l.videoId,
            title: l.title,
            artist: l.artist,
            duration: 0,
            thumbnail: l.albumArt || '',
          }));
          for (const l of data.likes) {
            newLikedVideoIds.add(l.videoId);
          }
        }
      }

      let newPlaylists: Playlist[] = [];
      if (playlistsRes.status === 'fulfilled' && playlistsRes.value.ok) {
        const data = await playlistsRes.value.json();
        if (Array.isArray(data.playlists)) {
          newPlaylists = data.playlists.map((p: any): Playlist => ({
            id: p.id,
            name: p.name,
            source: p.source || 'local',
            trackCount: p.trackCount,
            createdAt: p.createdAt,
          }));
        }
      }

      let newHistory: PlayHistoryItem[] = [];
      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        if (Array.isArray(data.history)) {
          newHistory = data.history.map((h: any): PlayHistoryItem => ({
            videoId: h.videoId,
            playedAt: h.playedAt,
            msPlayed: h.msPlayed ?? 0,
          }));
        }
      }

      set({
        likedVideoIds: newLikedVideoIds,
        likedTracks: newLikedTracks,
        playlists: newPlaylists,
        history: newHistory,
      });
    } catch (err) {
      console.warn('Failed to fetch library:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  isLiked: (videoId: string): boolean => {
    if (!videoId) return false;
    return get().likedVideoIds.has(videoId);
  },

  toggleLike: async (track: Track) => {
    const vid = track.videoId || track.id;
    if (!vid) return;

    const currentLikedIds = new Set(get().likedVideoIds);
    const currentTracks = [...get().likedTracks];
    const currentlyLiked = currentLikedIds.has(vid);

    // Optimistic update
    if (currentlyLiked) {
      currentLikedIds.delete(vid);
      const nextTracks = currentTracks.filter((t) => (t.videoId || t.id) !== vid);
      set({ likedVideoIds: currentLikedIds, likedTracks: nextTracks });

      try {
        const res = await fetch(`/api/likes/${encodeURIComponent(vid)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok && res.status !== 401) {
          // Rollback on non-auth error
          const rollbackIds = new Set(get().likedVideoIds);
          rollbackIds.add(vid);
          set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
        }
      } catch (err) {
        console.warn('Failed to unlike track:', err);
        const rollbackIds = new Set(get().likedVideoIds);
        rollbackIds.add(vid);
        set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
      }
    } else {
      currentLikedIds.add(vid);
      const nextTracks = [track, ...currentTracks];
      set({ likedVideoIds: currentLikedIds, likedTracks: nextTracks });

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
        if (!res.ok && res.status !== 401) {
          // Rollback on non-auth error
          const rollbackIds = new Set(get().likedVideoIds);
          rollbackIds.delete(vid);
          set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
        }
      } catch (err) {
        console.warn('Failed to like track:', err);
        const rollbackIds = new Set(get().likedVideoIds);
        rollbackIds.delete(vid);
        set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
      }
    }
  },

  createPlaylist: async (name: string): Promise<Playlist | null> => {
    if (!name.trim()) return null;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.playlist) {
        const created: Playlist = {
          id: data.playlist.id,
          name: data.playlist.name,
          source: data.playlist.source || 'local',
          trackCount: 0,
          createdAt: data.playlist.createdAt,
        };
        set((state) => ({
          playlists: [created, ...state.playlists],
        }));
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to create playlist:', err);
      return null;
    }
  },

  deletePlaylist: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) return false;
      set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id),
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      return false;
    }
  },

  addTracksToPlaylist: async (playlistId: string, tracks: Track[]): Promise<boolean> => {
    if (!tracks.length) return false;
    try {
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
      if (!res.ok) return false;
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, trackCount: (p.trackCount || 0) + tracks.length } : p
        ),
      }));
      return true;
    } catch (err) {
      console.error('Failed to add tracks to playlist:', err);
      return false;
    }
  },

  removeTrackFromPlaylist: async (playlistId: string, videoId: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(videoId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!res.ok) return false;
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, trackCount: Math.max(0, (p.trackCount || 1) - 1) }
            : p
        ),
      }));
      return true;
    } catch (err) {
      console.error('Failed to remove track from playlist:', err);
      return false;
    }
  },

  recordPlayHistory: async (videoId: string, msPlayed: number = 0): Promise<void> => {
    if (!videoId) return;
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoId, msPlayed }),
      });
    } catch (err) {
      // Fire-and-forget
      console.debug('Failed to record history:', err);
    }
  },

  fetchPlaylistTracks: async (playlistId: string): Promise<Track[]> => {
    try {
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
    } catch (err) {
      console.error('Failed to fetch playlist tracks:', err);
      return [];
    }
  },
}));
