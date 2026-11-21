import { Track } from '@mp/player-core';
import { type StoreSet, type StoreGet } from './types';
import { getSharedEngine } from './engineContext';

export const createQueueSlice = (set: StoreSet, get: StoreGet) => ({
  queue: [] as Track[],

  setQueue: (tracks: Track[], startIndex = 0, autoPlay = true) => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (engine) {
      engine.setQueue(tracks, startIndex, autoPlay);
    }
    const current = tracks[startIndex] || null;
    set({
      queue: [...tracks],
      currentIndex: startIndex,
      ...(autoPlay && current ? { currentTrack: current, playbackState: 'playing' as const } : {}),
    });
  },

  addToQueue: (track: Track) => {
    const engine = get().engine;
    if (engine) {
      engine.addToQueue(track);
    } else {
      set({ queue: [...get().queue, track] });
    }
  },

  playNext: (track: Track) => {
    const { queue, currentIndex } = get();
    if (currentIndex < 0 || queue.length === 0) {
      get().addToQueue(track);
      return;
    }
    const upcoming = [...queue];
    upcoming.splice(currentIndex + 1, 0, track);
    get().setQueue(upcoming, currentIndex, false);
  },

  removeFromQueue: (index: number) => {
    const engine = get().engine;
    if (engine) {
      engine.removeFromQueue(index);
    }
  },

  clearQueue: () => {
    const engine = get().engine;
    if (engine) {
      engine.clearQueue();
    }
    set({ queue: [], currentTrack: null, currentIndex: -1 });
  },
});
