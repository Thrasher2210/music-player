import { create } from 'zustand';
import type { Track } from '@mp/player-core';

interface TrackActionsState {
  /** Track waiting to be added to a playlist. The picker is open while this is set. */
  addToPlaylistTrack: Track | null;
  openAddToPlaylist: (track: Track) => void;
  closeAddToPlaylist: () => void;
}

export const useTrackActionsStore = create<TrackActionsState>((set) => ({
  addToPlaylistTrack: null,
  openAddToPlaylist: (track) => set({ addToPlaylistTrack: track }),
  closeAddToPlaylist: () => set({ addToPlaylistTrack: null }),
}));
