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
  ArtistDetails,
  AlbumDetails,
  RemotePlaylistDetails,
} from '@mp/player-core';
import { type TrackData } from '@mp/dying';
import { type LyricsResponse } from '@mp/api-contract';

export type { Track };
export type NetworkAdapterType = 'dev-proxy' | 'web-extension' | 'native-http';
export type StreamingStatus = 'Direct CDN via Extension' | 'Edge Fallback Proxy';

declare global {
  interface Window {
    __MP_EXTENSION_ACTIVE__?: boolean;
  }
}

export interface DiagnosticInfo {
  activeClient: InnerTubeClientName | null;
  activeItag: number | null;
  codec: string;
  bufferedAheadSeconds: number;
  bufferedPercent: number;
  playbackState: PlaybackState;
  networkAdapter: NetworkAdapterType;
  verdicts: ClientVerdict[];
  streamingStatus: StreamingStatus;
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
  streamingStatus: StreamingStatus;
  verdicts: ClientVerdict[];
  error: string | null;

  // Lyrics
  lyrics: LyricsResponse | null;
  isLyricsLoading: boolean;
  lyricsError: string | null;

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
  setQueue: (tracks: Track[], startIndex?: number, autoPlay?: boolean) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  search: (query: string) => Promise<Track[]>;
  setNetworkAdapterType: (type: NetworkAdapterType) => void;
  getDiagnosticInfo: () => DiagnosticInfo;
  getHomeFeed: (moodParam?: string) => Promise<HomeFeedData>;
  getNextRadio: (videoId: string, playlistId?: string) => Promise<NextRadioData>;
  getArtist: (browseId: string) => Promise<ArtistDetails>;
  getAlbum: (browseId: string) => Promise<AlbumDetails>;
  getPlaylist: (playlistId: string) => Promise<RemotePlaylistDetails>;
  fetchLyrics: (track: Track) => Promise<LyricsResponse | null>;
}

// Convert core Track to dying TrackData
export function toTrackData(track: Track): TrackData {
  return {
    id: track.id || track.videoId,
    title: track.title,
    artist: track.artist,
    artistId: track.artistId,
    album: track.album || 'YouTube Music',
    albumId: track.albumId,
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

const lyricsCache = new Map<string, LyricsResponse>();
let lyricsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedFetchLyrics(
  track: Track | null,
  fetchFn: (track: Track) => Promise<LyricsResponse | null>,
  delay = 250
) {
  if (lyricsDebounceTimer) {
    clearTimeout(lyricsDebounceTimer);
    lyricsDebounceTimer = null;
  }
  if (!track || !track.videoId) return;

  if (lyricsCache.has(track.videoId)) {
    fetchFn(track);
    return;
  }

  lyricsDebounceTimer = setTimeout(() => {
    fetchFn(track);
  }, delay);
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
  streamingStatus:
    typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__)
      ? 'Direct CDN via Extension'
      : 'Edge Fallback Proxy',
  verdicts: [],
  error: null,

  lyrics: null,
  isLyricsLoading: false,
  lyricsError: null,

  initialize: (mediaElement?: HTMLMediaElement) => {
    if (typeof window === 'undefined') return;

    const isExtensionActive = Boolean(window.__MP_EXTENSION_ACTIVE__);

    if (get().isInitialized && sharedEngine) {
      if (isExtensionActive && get().networkAdapterType !== 'web-extension') {
        get().setNetworkAdapterType('web-extension');
      }
      return;
    }

    if (mediaElement) {
      sharedMediaElement = mediaElement;
    }

    // Auto-configure direct streaming / web extension adapter if extension is active
    const adapterType: NetworkAdapterType = isExtensionActive
      ? 'web-extension'
      : get().networkAdapterType;
    const adapter = createNetworkAdapter(adapterType);

    const engine = new PlayerEngine({
      networkAdapter: adapter,
      mediaElement: sharedMediaElement || undefined,
    });
    sharedEngine = engine;

    // Listen for late extension activation if extension content script activates after store init
    window.addEventListener('message', (event) => {
      if (
        event.data?.type === 'MP_EXTENSION_READY' ||
        (typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__))
      ) {
        if (get().networkAdapterType !== 'web-extension') {
          get().setNetworkAdapterType('web-extension');
        }
      }
    });

    // Bind engine event listeners
    engine.on('stateChange', (state) => {
      set({ playbackState: state, error: state === 'error' ? get().error : null });
    });

    engine.on('trackChange', (track, index) => {
      const prev = get().currentTrack;
      const isSameVideo = Boolean(prev?.videoId && track?.videoId && prev.videoId === track.videoId);
      const cached = track?.videoId ? lyricsCache.get(track.videoId) : null;
      set({
        currentTrack: track ? { ...track } : null,
        currentIndex: index,
        ...(isSameVideo ? {} : {
          currentTime: 0,
          bufferedAheadSeconds: 0,
          bufferedPercent: 0,
        }),
        lyrics: cached || null,
        isLyricsLoading: track ? !cached : false,
        lyricsError: null,
      });
      if (track && (!isSameVideo || !get().lyrics)) {
        debouncedFetchLyrics(track, get().fetchLyrics);
      }
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
      networkAdapterType: adapterType,
      streamingStatus:
        isExtensionActive || adapterType === 'web-extension'
          ? 'Direct CDN via Extension'
          : 'Edge Fallback Proxy',
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
    const cached = track.videoId ? lyricsCache.get(track.videoId) : null;
    set({
      currentTrack: track,
      playbackState: 'playing',
      error: null,
      lyrics: cached || null,
      isLyricsLoading: track.videoId ? !cached : false,
      lyricsError: null,
    });

    debouncedFetchLyrics(track, get().fetchLyrics);

    try {
      await engine.playTrack(track);

      // Auto-fetch Up Next 50-track radio mix in background if queue is single track
      if (track.videoId && get().queue.length <= 1) {
        get().getNextRadio(track.videoId).catch(() => {});
      }
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

    const isCurrentlyPlaying = playbackState === 'playing' || !currentEng.getAudioDriver()?.isPaused();

    if (isCurrentlyPlaying) {
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
        } else if (get().currentTrack) {
          await currentEng.playTrack(get().currentTrack!);
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
    const engine = get().engine || sharedEngine;
    if (engine) {
      await engine.seek(seconds);
      set({ currentTime: seconds });
    }
  },

  next: async () => {
    const engine = get().engine || sharedEngine;
    if (engine) {
      try {
        await engine.next();
      } catch (err: any) {
        console.warn('[PlayerStore] Error playing next track:', err);
        set({ error: err?.message || 'Track playback failed' });
        // Auto-skip unplayable track if more tracks exist in queue
        const q = engine.getQueue();
        const idx = engine.getCurrentIndex();
        if (idx < q.length - 1) {
          get().next().catch(() => {});
        }
      }
      const current = engine.getCurrentTrack();
      if (current) {
        const cached = current.videoId ? lyricsCache.get(current.videoId) : null;
        set({
          lyrics: cached || null,
          isLyricsLoading: current.videoId ? !cached : false,
          lyricsError: null,
        });
        debouncedFetchLyrics(current, get().fetchLyrics);
      }
    }
  },

  previous: async () => {
    const engine = get().engine || sharedEngine;
    if (engine) {
      try {
        await engine.previous();
      } catch (err: any) {
        console.warn('[PlayerStore] Error playing previous track:', err);
        set({ error: err?.message || 'Track playback failed' });
      }
      const current = engine.getCurrentTrack();
      if (current) {
        const cached = current.videoId ? lyricsCache.get(current.videoId) : null;
        set({
          lyrics: cached || null,
          isLyricsLoading: current.videoId ? !cached : false,
          lyricsError: null,
        });
        debouncedFetchLyrics(current, get().fetchLyrics);
      }
    }
  },

  setVolume: (volume: number) => {
    const engine = get().engine || sharedEngine;
    const clamped = Math.max(0, Math.min(1, volume));
    if (engine) {
      engine.setVolume(clamped);
    }
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    const engine = get().engine || sharedEngine;
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

  setQueue: (tracks: Track[], startIndex = 0, autoPlay = true) => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (engine) {
      engine.setQueue(tracks, startIndex, autoPlay);
    }
    const current = tracks[startIndex] || null;
    set({
      queue: [...tracks],
      currentIndex: startIndex,
      ...(autoPlay && current ? { currentTrack: current, playbackState: 'playing' } : {}),
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
    const isDirect =
      type === 'web-extension' ||
      (typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__));
    set({
      networkAdapterType: type,
      streamingStatus: isDirect ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
    });
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

  getNextRadio: async (videoId: string, playlistId?: string): Promise<NextRadioData> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = sharedEngine;
    }
    if (!engine) return { queue: [], related: [] };
    const radioData = await engine.getNextRadio(videoId, playlistId);
    if (radioData.queue.length > 0) {
      // Enrich currentTrack in store if it has placeholder metadata
      const currentTrack = get().currentTrack;
      const firstRadioTrack = radioData.queue[0];
      if (
        currentTrack &&
        firstRadioTrack &&
        (currentTrack.videoId === firstRadioTrack.videoId || currentTrack.title === 'Loading...')
      ) {
        const enriched: Track = {
          ...currentTrack,
          title: (currentTrack.title === 'Loading...' ? firstRadioTrack.title : currentTrack.title) || firstRadioTrack.title,
          artist: (currentTrack.artist === 'YouTube Music' ? firstRadioTrack.artist : currentTrack.artist) || firstRadioTrack.artist,
          thumbnail: (!currentTrack.thumbnail ? firstRadioTrack.thumbnail : currentTrack.thumbnail) || firstRadioTrack.thumbnail,
          duration: firstRadioTrack.duration || currentTrack.duration,
        };
        const q = engine.getQueue();
        if (q.length > 0 && (q[0].videoId === enriched.videoId || q[0].title === 'Loading...')) {
          q[0] = enriched;
          (engine as any).queue = q;
        }
        set({ currentTrack: enriched, queue: [...engine.getQueue()] });
      }

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

  getArtist: async (browseId: string): Promise<ArtistDetails> => {
    let engine = get().engine || sharedEngine;
    if (!engine) {
      const isExt = typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__);
      const adapterType: NetworkAdapterType = isExt ? 'web-extension' : get().networkAdapterType;
      const adapter = createNetworkAdapter(adapterType);
      sharedEngine = new PlayerEngine({ networkAdapter: adapter });
      set({
        engine: sharedEngine,
        networkAdapterType: adapterType,
        streamingStatus: isExt || adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      });
      engine = sharedEngine;
    }
    return engine.getArtist(browseId);
  },

  getAlbum: async (browseId: string): Promise<AlbumDetails> => {
    let engine = get().engine || sharedEngine;
    if (!engine) {
      const isExt = typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__);
      const adapterType: NetworkAdapterType = isExt ? 'web-extension' : get().networkAdapterType;
      const adapter = createNetworkAdapter(adapterType);
      sharedEngine = new PlayerEngine({ networkAdapter: adapter });
      set({
        engine: sharedEngine,
        networkAdapterType: adapterType,
        streamingStatus: isExt || adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      });
      engine = sharedEngine;
    }
    return engine.getAlbum(browseId);
  },

  getPlaylist: async (playlistId: string): Promise<RemotePlaylistDetails> => {
    let engine = get().engine || sharedEngine;
    if (!engine) {
      const isExt = typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__);
      const adapterType: NetworkAdapterType = isExt ? 'web-extension' : get().networkAdapterType;
      const adapter = createNetworkAdapter(adapterType);
      sharedEngine = new PlayerEngine({ networkAdapter: adapter });
      set({
        engine: sharedEngine,
        networkAdapterType: adapterType,
        streamingStatus: isExt || adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      });
      engine = sharedEngine;
    }
    return engine.getPlaylist(playlistId);
  },

  getDiagnosticInfo: (): DiagnosticInfo => {
    const s = get();
    const isExtensionActive =
      typeof window !== 'undefined' && Boolean(window.__MP_EXTENSION_ACTIVE__);
    const isDirect = isExtensionActive || s.networkAdapterType === 'web-extension';
    const streamingStatus: StreamingStatus = isDirect
      ? 'Direct CDN via Extension'
      : 'Edge Fallback Proxy';

    return {
      activeClient: s.activeClient,
      activeItag: s.activeItag,
      codec: s.codec,
      bufferedAheadSeconds: s.bufferedAheadSeconds,
      bufferedPercent: s.bufferedPercent,
      playbackState: s.playbackState,
      networkAdapter: isDirect ? 'web-extension' : s.networkAdapterType,
      verdicts: s.verdicts,
      streamingStatus,
    };
  },

  fetchLyrics: async (track: Track): Promise<LyricsResponse | null> => {
    if (!track || !track.videoId) {
      set({ lyrics: null, isLyricsLoading: false, lyricsError: null });
      return null;
    }

    if (lyricsCache.has(track.videoId)) {
      const cached = lyricsCache.get(track.videoId)!;
      set({ lyrics: cached, isLyricsLoading: false, lyricsError: null });
      return cached;
    }

    set({ isLyricsLoading: true, lyricsError: null });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const durationSec = track.duration || 0;
      const url = `${apiUrl}/api/lyrics?videoId=${encodeURIComponent(track.videoId)}&title=${encodeURIComponent(track.title || '')}&artist=${encodeURIComponent(track.artist || '')}&durationSec=${durationSec}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch lyrics: HTTP ${res.status}`);
      }
      const data: LyricsResponse = await res.json();
      lyricsCache.set(track.videoId, data);

      const current = get().currentTrack;
      if (current && (current.videoId === track.videoId || current.id === track.id)) {
        set({ lyrics: data, isLyricsLoading: false, lyricsError: null });
      }
      return data;
    } catch (err: any) {
      const msg = err?.message || 'Failed to load lyrics';
      const current = get().currentTrack;
      if (current && (current.videoId === track.videoId || current.id === track.id)) {
        set({ lyrics: null, isLyricsLoading: false, lyricsError: msg });
      }
      return null;
    }
  },
}));
