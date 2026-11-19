'use client';

import { create } from 'zustand';
import {
  type Track,
  type RemotePlaylistDetails,
  WebExtensionAdapter,
  InnerTubeClient,
} from '@mp/player-core';
import {
  likeTrackApi,
  createPlaylistApi,
  addTracksToPlaylistApi,
} from './library/libraryApi';
import { useLibraryStore } from './libraryStore';

export interface YouTubeAccount {
  name?: string;
  avatar?: string;
  handle?: string;
}

export interface YouTubeAuthState {
  isExtensionInstalled: boolean;
  isYouTubeAuthenticated: boolean;
  youtubeAccount: YouTubeAccount | null;
  syncedLikedTracks: Track[];
  syncedPlaylists: (RemotePlaylistDetails | any)[];
  isChecking: boolean;
  isSyncing: boolean;

  checkStatus: () => Promise<void>;
  syncLibrary: () => Promise<void>;
  resetSync: () => void;
}

export const useYouTubeAuthStore = create<YouTubeAuthState>((set) => ({
  isExtensionInstalled: false,
  isYouTubeAuthenticated: false,
  youtubeAccount: null,
  syncedLikedTracks: [],
  syncedPlaylists: [],
  isChecking: false,
  isSyncing: false,

  checkStatus: async () => {
    if (typeof window === 'undefined') return;
    set({ isChecking: true });

    try {
      const adapter = new WebExtensionAdapter();
      let installed = Boolean((window as any).__MP_EXTENSION_ACTIVE__);

      if (!installed) {
        try {
          installed = await adapter.checkExtension(400);
        } catch {
          installed = false;
        }
      }

      if (!installed) {
        set({
          isExtensionInstalled: false,
          isYouTubeAuthenticated: false,
          youtubeAccount: null,
        });
        return;
      }

      let connected = false;
      let account: YouTubeAccount | null = null;

      try {
        const auth = await adapter.getYouTubeAuthStatus(1500);
        if (auth) {
          connected = Boolean(auth.connected);
          account = auth.account || null;
        }
      } catch {
        connected = false;
        account = null;
      }

      set({
        isExtensionInstalled: true,
        isYouTubeAuthenticated: connected,
        youtubeAccount: account,
      });
    } catch (err) {
      console.warn('[youtubeAuthStore] checkStatus failed:', err);
      set({
        isExtensionInstalled: false,
        isYouTubeAuthenticated: false,
        youtubeAccount: null,
      });
    } finally {
      set({ isChecking: false });
    }
  },

  syncLibrary: async () => {
    set({ isSyncing: true });
    try {
      const adapter = new WebExtensionAdapter();
      const client = new InnerTubeClient({ networkAdapter: adapter });

      let likedTracks: Track[] = [];
      let playlists: any[] = [];

      if (typeof (client as any).getLikedVideos === 'function') {
        try {
          likedTracks = await (client as any).getLikedVideos();
        } catch (err) {
          console.warn('[youtubeAuthStore] getLikedVideos error:', err);
        }
      }

      if (typeof (client as any).getLibraryPlaylists === 'function') {
        try {
          playlists = await (client as any).getLibraryPlaylists();
        } catch (err) {
          console.warn('[youtubeAuthStore] getLibraryPlaylists error:', err);
        }
      }

      set({
        syncedLikedTracks: Array.isArray(likedTracks) ? likedTracks : [],
        syncedPlaylists: Array.isArray(playlists) ? playlists : [],
      });

      // Persist synced items into backend database (PostgreSQL/PGlite)
      try {
        if (Array.isArray(likedTracks) && likedTracks.length > 0) {
          await Promise.allSettled(likedTracks.map((t) => likeTrackApi(t)));
        }

        if (Array.isArray(playlists) && playlists.length > 0) {
          const currentLibPlaylists = useLibraryStore.getState().playlists;
          for (const pl of playlists) {
            const plName = pl.title || pl.name;
            const plId = pl.id || pl.playlistId;
            if (!plName) continue;
            const alreadyExists = currentLibPlaylists.some(
              (p) => p.name === plName || p.id === plId
            );
            if (!alreadyExists) {
              const created = await createPlaylistApi(plName, {
                source: 'youtube',
                ytPlaylistId: plId,
                coverArt: pl.coverUrl,
              });
              if (created && Array.isArray(pl.tracks) && pl.tracks.length > 0) {
                await addTracksToPlaylistApi(created.id, pl.tracks);
              }
            }
          }
        }

        // Re-fetch library data so all screens display the persisted data
        await useLibraryStore.getState().fetchLibrary();
      } catch (persistErr) {
        console.warn('[youtubeAuthStore] Persistence to backend DB error:', persistErr);
      }
    } catch (err) {
      console.warn('[youtubeAuthStore] syncLibrary failed:', err);
    } finally {
      set({ isSyncing: false });
    }
  },

  resetSync: () => {
    set({
      syncedLikedTracks: [],
      syncedPlaylists: [],
    });
  },
}));
