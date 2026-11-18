'use client';

import { create } from 'zustand';
import {
  PlayerEngine,
  Track,
  PlaybackState,
  RepeatMode,
  InnerTubeClientName,
  ClientVerdict,
  DevProxyAdapter,
  WebExtensionAdapter,
  NativeHttpAdapter,
  NetworkAdapter,
  HomeFeedData,
  NextRadioData,
} from '@mp/player-core';
import { type TrackData } from '@mp/dying';

export type NetworkAdapterType = 'dev-proxy' | 'web-extension' | 'native-http';

export interface DiagnosticInfo {
  activeClient: InnerTubeClientName | null;
  activeItag: number | null;
  codec: string;
  bufferedAheadSeconds: number;
  bufferedPercent: number;
  playbackState: PlaybackState;
  networkAdapter: NetworkAdapterType;
  verdicts: ClientVerdict[];
}

export interface PlayerStoreState {
  // Engine & Playback
  engine: PlayerEngine | null;
  isInitialized: boolean;
  playbackState: PlaybackState;
  currentTrack: Track | null;
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: Track[];

  // Diagnostics & InnerTube
  activeClient: InnerTubeClientName | null;
  activeItag: number | null;
  codec: string;
  bufferedAheadSeconds: number;
  bufferedPercent: number;
  networkAdapterType: NetworkAdapterType;
  verdicts: ClientVerdict[];
  error: string | null;

  // Actions
  initialize: (mediaElement?: HTMLMediaElement) => void;
  playTrack: (track: Track) => Promise<void>;
  play: (index?: number) => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleRepeat: () => void;
  setShuffle: (shuffle: boolean) => void;
  toggleShuffle: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  search: (query: string) => Promise<Track[]>;
  setNetworkAdapterType: (type: NetworkAdapterType) => void;
  getDiagnosticInfo: () => DiagnosticInfo;
  getHomeFeed: (moodParam?: string) => Promise<HomeFeedData>;
  getNextRadio: (videoId: string) => Promise<NextRadioData>;
}

// Convert core Track to dying TrackData
export function toTrackData(track: Track): TrackData {
  return {
    id: track.id || track.videoId,
    title: track.title,
    artist: track.artist,
    album: track.album || 'YouTube Music',
    duration: track.duration,
    thumbnailUrl: track.thumbnail,
  };
}

let sharedEngine: PlayerEngine | null = null;
let sharedMediaElement: HTMLMediaElement | null = null;

function createNetworkAdapter(type: NetworkAdapterType): NetworkAdapter {
  switch (type) {
    case 'dev-proxy':
      return new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
    case 'web-extension':
      return new WebExtensionAdapter();
    case 'native-http':
      return new NativeHttpAdapter();
    default:
      return new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
  }
}

function updateBufferStatus(
  mediaEl: HTMLMediaElement | null,
  currentTime: number,
  duration: number,
  set: (state: Partial<PlayerStoreState>) => void
) {
  if (!mediaEl || !mediaEl.buffered || mediaEl.buffered.length === 0) {
    return;
  }
  let ahead = 0;
  let maxEnd = 0;
  for (let i = 0; i < mediaEl.buffered.length; i++) {
    const start = mediaEl.buffered.start(i);
    const end = mediaEl.buffered.end(i);
    if (end > maxEnd) maxEnd = end;
    if (currentTime >= start && currentTime <= end) {
      ahead = Math.max(0, end - currentTime);
    }
  }
  const dur = duration || mediaEl.duration || 0;
  const percent = dur > 0 ? Math.min(100, (maxEnd / dur) * 100) : 0;
  set({
    bufferedAheadSeconds: parseFloat(ahead.toFixed(1)),
    bufferedPercent: parseFloat(percent.toFixed(1)),
  });
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  engine: null,
  isInitialized: false,
  playbackState: 'idle',
  currentTrack: null,
  currentIndex: -1,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  repeatMode: 'off',
  isShuffle: false,
  queue: [],

  activeClient: null,
  activeItag: 251, // default preferred itag (Opus 160k)
  codec: 'Opus 48kHz (itag 251)',
  bufferedAheadSeconds: 0,
  bufferedPercent: 0,
  networkAdapterType: 'dev-proxy',
  verdicts: [],
  error: null,

  initialize: (mediaElement?: HTMLMediaElement) => {
    if (typeof window === 'undefined') return;
    if (get().isInitialized && sharedEngine) return;

    if (mediaElement) {
      sharedMediaElement = mediaElement;
    }

    const adapterType = get().networkAdapterType;
    const adapter = createNetworkAdapter(adapterType);

    const engine = new PlayerEngine({
      networkAdapter: adapter,
      mediaElement: sharedMediaElement || undefined,
    });
    sharedEngine = engine;

    // Bind engine event listeners
    engine.on('stateChange', (state) => {
      set({ playbackState: state, error: state === 'error' ? get().error : null });
    });

    engine.on('trackChange', (track, index) => {
      set({
        currentTrack: track,
        currentIndex: index,
        currentTime: 0,
        bufferedAheadSeconds: 0,
        bufferedPercent: 0,
      });
    });

    engine.on('timeUpdate', (time) => {
      set({ currentTime: time });
      const driver = engine.getAudioDriver() as any;
      const mediaEl = sharedMediaElement || driver?.mediaElement;
      updateBufferStatus(mediaEl, time, get().duration, set);
    });

    engine.on('durationChange', (dur) => {
      set({ duration: dur });
    });

    engine.on('volumeChange', (vol) => {
      set({ volume: vol, isMuted: vol === 0 });
    });

    engine.on('queueChange', (q) => {
      set({ queue: [...q] });
    });

    engine.on('walkVerdict', (verdicts, selectedClient) => {
      const isOpus = selectedClient !== 'MWEB';
      const itag = isOpus ? 251 : 140;
      const codec = isOpus ? 'Opus 48kHz (itag 251)' : 'AAC 44.1kHz (itag 140)';
      set({
        verdicts: [...verdicts],
        activeClient: selectedClient,
        activeItag: itag,
        codec,
      });
    });

    engine.on('error', (err) => {
      set({ error: err.message || 'Playback error occurred' });
    });

    engine.on('ended', () => {
      set({ playbackState: 'ended' });
    });

    // Initial sync
    engine.setVolume(get().volume);

    set({
      engine,
      isInitialized: true,
      activeClient: engine.getActiveClient(),
      queue: engine.getQueue(),
    });
  },

  playTrack: async (track: Track) => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (!engine) return;

    // Optimistic instant state flip
    set({
      currentTrack: track,
      playbackState: 'playing',
      error: null,
    });

    try {
      await engine.playTrack(track);
    } catch (err: any) {
      set({
        playbackState: 'idle',
        error: err?.message || 'Failed to play track',
      });
    }
  },

  play: async (index?: number) => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (!engine) return;

    // Optimistic instant state flip
    set({ playbackState: 'playing', error: null });

    try {
      await engine.play(index);
    } catch (err: any) {
      set({
        playbackState: 'paused',
        error: err?.message || 'Playback failed',
      });
    }
  },

  pause: async () => {
    // Optimistic instant state flip
    set({ playbackState: 'paused' });
    const engine = get().engine;
    if (engine) {
      try {
        await engine.pause();
      } catch {
        // Ignored
      }
    }
  },

  togglePlay: async () => {
    const { engine, playbackState, queue } = get();
    if (!engine) {
      get().initialize();
    }
    const currentEng = sharedEngine;
    if (!currentEng) return;

    if (playbackState === 'playing') {
      // Optimistic instant toggle to paused (0ms UI latency)
      set({ playbackState: 'paused' });
      try {
        await currentEng.pause();
      } catch {
        set({ playbackState: 'playing' });
      }
    } else {
      // Optimistic instant toggle to playing (0ms UI latency)
      set({ playbackState: 'playing', error: null });
      try {
        if (currentEng.getCurrentTrack()) {
          await currentEng.play();
        } else if (queue.length > 0) {
          await currentEng.play(0);
        }
      } catch (err: any) {
        set({
          playbackState: 'paused',
          error: err?.message || 'Playback failed',
        });
      }
    }
  },

  seek: async (seconds: number) => {
    const engine = get().engine;
    if (engine) {
      await engine.seek(seconds);
      set({ currentTime: seconds });
    }
  },

  next: async () => {
    const engine = get().engine;
    if (engine) {
      await engine.next();
    }
  },

  previous: async () => {
    const engine = get().engine;
    if (engine) {
      await engine.previous();
    }
  },

  setVolume: (volume: number) => {
    const engine = get().engine;
    const clamped = Math.max(0, Math.min(1, volume));
    if (engine) {
      engine.setVolume(clamped);
    }
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume, engine } = get();
    if (isMuted) {
      const restored = volume === 0 ? 0.75 : volume;
      if (engine) engine.setVolume(restored);
      set({ isMuted: false, volume: restored });
    } else {
      if (engine) engine.setVolume(0);
      set({ isMuted: true });
    }
  },

  setRepeatMode: (mode: RepeatMode) => {
    const engine = get().engine;
    if (engine) engine.setRepeatMode(mode);
    set({ repeatMode: mode });
  },

  toggleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(get().repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    get().setRepeatMode(nextMode);
  },

  setShuffle: (shuffle: boolean) => {
    const engine = get().engine;
    if (engine) engine.setShuffle(shuffle);
    set({ isShuffle: shuffle });
  },

  toggleShuffle: () => {
    const nextShuffle = !get().isShuffle;
    get().setShuffle(nextShuffle);
  },

  setQueue: (tracks: Track[], startIndex = 0) => {
    const engine = get().engine;
    if (engine) {
      engine.setQueue(tracks, startIndex);
    }
    set({ queue: [...tracks], currentIndex: startIndex });
  },

  addToQueue: (track: Track) => {
    const engine = get().engine;
    if (engine) {
      engine.addToQueue(track);
    } else {
      set({ queue: [...get().queue, track] });
    }
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

  search: async (query: string): Promise<Track[]> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (!engine) return [];
    return engine.search(query);
  },

  setNetworkAdapterType: (type: NetworkAdapterType) => {
    const engine = get().engine;
    if (engine) {
      const newAdapter = createNetworkAdapter(type);
      engine.setNetworkAdapter(newAdapter);
    }
    set({ networkAdapterType: type });
  },

  getHomeFeed: async (moodParam?: string): Promise<HomeFeedData> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (!engine) return { chips: [], quickPicks: [], shelves: [] };
    return engine.getHomeFeed(moodParam);
  },

  getNextRadio: async (videoId: string): Promise<NextRadioData> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (!engine) return { queue: [], related: [] };
    const radioData = await engine.getNextRadio(videoId);
    if (radioData.queue.length > 0) {
      // Append new radio songs to the engine queue if not already present
      const currentQueue = get().queue;
      const existingIds = new Set(currentQueue.map((t) => t.id || t.videoId));
      const newTracks = radioData.queue.filter((t) => !existingIds.has(t.id || t.videoId));
      if (newTracks.length > 0) {
        for (const t of newTracks) {
          engine.addToQueue(t);
        }
      }
    }
    return radioData;
  },

  getDiagnosticInfo: (): DiagnosticInfo => {
    const s = get();
    return {
      activeClient: s.activeClient,
      activeItag: s.activeItag,
      codec: s.codec,
      bufferedAheadSeconds: s.bufferedAheadSeconds,
      bufferedPercent: s.bufferedPercent,
      playbackState: s.playbackState,
      networkAdapter: s.networkAdapterType,
      verdicts: s.verdicts,
    };
  },
}));
