import {
  ClientVerdict,
  HomeFeedData,
  InnerTubeClientName,
  NextRadioData,
  PlaybackState,
  RepeatMode,
  ShelfItemData,
  Track,
} from '../types';
import { NetworkAdapter, NativeHttpAdapter } from '../adapters/network';
import { InnerTubeClient } from '../innertube/client';
import { executeClientWalk, invalidateStreamCache, prefetchStream, VerdictCache } from '../walk/clientWalk';
import { createDashBlobUrl, generateDashMpd } from '../manifest/dashGenerator';
import { AudioDriver, ShakaMseAudioDriver } from '../drivers/audio';

export interface PlayerEngineEvents extends Record<string, (...args: any[]) => void> {
  stateChange: (state: PlaybackState) => void;
  trackChange: (track: Track | null, index: number) => void;
  timeUpdate: (currentTime: number) => void;
  durationChange: (duration: number) => void;
  volumeChange: (volume: number) => void;
  queueChange: (queue: Track[]) => void;
  walkVerdict: (verdicts: ClientVerdict[], selectedClient: InnerTubeClientName) => void;
  error: (error: Error) => void;
  ended: () => void;
}

export interface PlayerEngineOptions {
  networkAdapter?: NetworkAdapter;
  audioDriver?: AudioDriver;
  mediaElement?: HTMLMediaElement;
}

/**
 * Portable Typed EventEmitter for PlayerEngine
 */
export class TypedEventEmitter<Events extends Record<string, (...args: any[]) => void>> {
  private listeners: { [K in keyof Events]?: Set<Events[K]> } = {};

  on<K extends keyof Events>(event: K, listener: Events[K]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Events[K]): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    const handlers = this.listeners[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (e) {
          console.error(`[TypedEventEmitter] Error in listener for ${String(event)}:`, e);
        }
      }
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

/**
 * PlayerEngine: Unified high-level orchestrator for @mp/player-core
 * Connects InnerTube metadata, Client Walk verdict benching, synthetic DASH generation,
 * and MSE audio streaming into an EventEmitter facade.
 */
export class PlayerEngine extends TypedEventEmitter<PlayerEngineEvents> {
  private networkAdapter: NetworkAdapter;
  private innerTube: InnerTubeClient;
  private verdictCache: VerdictCache;
  private audioDriver: AudioDriver;

  private queue: Track[] = [];
  private currentIndex = -1;
  private playbackState: PlaybackState = 'idle';
  private currentTime = 0;
  private duration = 0;
  private volume = 1;
  private repeatMode: RepeatMode = 'off';
  private isShuffle = false;
  private activeClient: InnerTubeClientName | null = null;
  private playRequestId = 0;

  constructor(options: PlayerEngineOptions = {}) {
    super();
    this.networkAdapter = options.networkAdapter || new NativeHttpAdapter();
    this.innerTube = new InnerTubeClient({ networkAdapter: this.networkAdapter });
    this.verdictCache = new VerdictCache();
    this.audioDriver = options.audioDriver || new ShakaMseAudioDriver();

    this.setupDriverSubscriptions();

    if (options.mediaElement) {
      this.audioDriver.initialize(options.mediaElement).catch((err) => {
        this.emit('error', err);
      });
    }
  }

  private setupDriverSubscriptions(): void {
    this.audioDriver.on('stateChange', (state) => {
      this.playbackState = state;
      this.emit('stateChange', state);
    });

    this.audioDriver.on('timeUpdate', (time) => {
      this.currentTime = time;
      this.emit('timeUpdate', time);
    });

    this.audioDriver.on('durationChange', (dur) => {
      this.duration = dur;
      this.emit('durationChange', dur);
    });

    this.audioDriver.on('ended', () => {
      this.emit('ended');
      this.handleTrackEnded();
    });

    this.audioDriver.on('error', (err) => {
      const currentTrack = this.getCurrentTrack();
      if (currentTrack?.videoId) {
        invalidateStreamCache(currentTrack.videoId);
      }
      // If error occurred mid-stream, bench active client immediately so walk falls back to the next client
      if (this.activeClient) {
        this.verdictCache.bench(this.activeClient, `mid-stream chunk stall: ${err.message}`);
      }
      this.playbackState = 'error';
      this.emit('error', err);

      // Attempt immediate seamless auto-recovery at the current timestamp so playback never halts
      if (currentTrack?.videoId) {
        const resumeTime = Math.max(0, this.currentTime);
        this.play(undefined, resumeTime).catch(() => {});
      }
    });
  }

  private handleTrackEnded(): void {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play().catch((err) => this.emit('error', err));
      return;
    }

    if (this.hasNext()) {
      this.next().catch((err) => this.emit('error', err));
    } else if (this.repeatMode === 'all' && this.queue.length > 0) {
      this.play(0).catch((err) => this.emit('error', err));
    } else {
      this.playbackState = 'ended';
      this.emit('stateChange', 'ended');
    }
  }

  /**
   * Replace or update the current network adapter (e.g. switching to Extension Bridge or Dev Proxy)
   */
  setNetworkAdapter(adapter: NetworkAdapter): void {
    this.networkAdapter = adapter;
    this.innerTube.setNetworkAdapter(adapter);
  }

  getNetworkAdapter(): NetworkAdapter {
    return this.networkAdapter;
  }

  getInnerTubeClient(): InnerTubeClient {
    return this.innerTube;
  }

  getVerdictCache(): VerdictCache {
    return this.verdictCache;
  }

  getAudioDriver(): AudioDriver {
    return this.audioDriver;
  }

  // --- Queue Management ---

  getQueue(): Track[] {
    return [...this.queue];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentTrack(): Track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  setQueue(tracks: Track[], startIndex = 0, autoPlay = true): void {
    this.queue = [...tracks];
    this.emit('queueChange', this.getQueue());

    if (this.queue.length > 0) {
      const idx = Math.max(0, Math.min(startIndex, this.queue.length - 1));
      if (autoPlay) {
        this.play(idx).catch((err) => this.emit('error', err));
      } else {
        this.currentIndex = idx;
        this.emit('trackChange', this.getCurrentTrack(), this.currentIndex);
      }
    } else {
      this.currentIndex = -1;
      this.emit('trackChange', null, -1);
    }
  }

  addToQueue(track: Track): void {
    this.queue.push(track);
    this.emit('queueChange', this.getQueue());
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
      this.emit('trackChange', track, 0);
    }
  }

  removeFromQueue(index: number): void {
    if (index < 0 || index >= this.queue.length) return;
    this.queue.splice(index, 1);
    this.emit('queueChange', this.getQueue());

    if (index === this.currentIndex) {
      if (this.queue.length === 0) {
        this.currentIndex = -1;
        this.pause();
        this.emit('trackChange', null, -1);
      } else {
        const nextIndex = Math.min(index, this.queue.length - 1);
        this.play(nextIndex).catch((err) => this.emit('error', err));
      }
    } else if (index < this.currentIndex) {
      this.currentIndex--;
      this.emit('trackChange', this.getCurrentTrack(), this.currentIndex);
    }
  }

  clearQueue(): void {
    this.pause();
    this.queue = [];
    this.currentIndex = -1;
    this.emit('queueChange', []);
    this.emit('trackChange', null, -1);
  }

  // --- Playback Controls ---

  async playTrack(track: Track): Promise<void> {
    const existingIndex = this.queue.findIndex((t) => t.videoId === track.videoId);
    if (existingIndex !== -1) {
      await this.play(existingIndex);
    } else {
      this.queue.splice(this.currentIndex + 1, 0, track);
      this.emit('queueChange', this.getQueue());
      await this.play(this.currentIndex + 1);
    }
  }

  async play(index?: number, startTime?: number): Promise<void> {
    if (typeof index === 'number') {
      if (index < 0 || index >= this.queue.length) return;
      this.currentIndex = index;
    } else {
      // Fast-path: ONLY if healthy and paused (never if driver or state is in error)
      if (
        this.playbackState === 'paused' &&
        this.audioDriver.getState() === 'paused' &&
        this.getCurrentTrack()
      ) {
        this.playbackState = 'playing';
        this.emit('stateChange', 'playing');
        await this.audioDriver.play();
        return;
      }
    }

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    // If recovering from an error or startTime is provided, resume at that timestamp instead of 0
    const startSeek =
      typeof startTime === 'number'
        ? startTime
        : this.playbackState === 'error'
          ? Math.max(0, this.currentTime)
          : 0;

    if (this.playbackState === 'error') {
      invalidateStreamCache(currentTrack.videoId);
    }

    this.emit('trackChange', currentTrack, this.currentIndex);

    const currentRequestId = ++this.playRequestId;
    this.playbackState = 'loading';
    this.emit('stateChange', 'loading');

    try {
      // 1. Resolve stream through client walk
      const walkResult = await executeClientWalk(
        currentTrack.videoId,
        this.innerTube,
        this.verdictCache
      );

      // Stale request guard
      if (currentRequestId !== this.playRequestId) return;

      this.activeClient = walkResult.client;
      this.emit('walkVerdict', walkResult.verdicts, walkResult.client);

      const serverAbrStreamingUrl =
        walkResult.serverAbrStreamingUrl ||
        walkResult.playerResponse.streamingData?.serverAbrStreamingUrl ||
        (walkResult.playerResponse.streamingData as any)?.server_abr_streaming_url;

      const isSabr = Boolean((walkResult.is_sabr || walkResult.isSabr) && serverAbrStreamingUrl);

      // Configure SABR on audioDriver if active
      if (typeof (this.audioDriver as any).configureSabr === 'function' && isSabr) {
        const ustreamerConfig =
          (walkResult.playerResponse as any)?.playerConfig?.mediaCommonConfig?.mediaUstreamerRequestConfig?.videoPlaybackUstreamerConfig ||
          (walkResult.playerResponse as any)?.videoPlaybackUstreamerConfig ||
          'CAE=';

        (this.audioDriver as any).configureSabr({
          serverAbrStreamingUrl,
          ustreamerConfig,
          formats: walkResult.audioFormats,
        });
      }

      // 2. Generate synthetic DASH MPD XML manifest
      const mpdXml = generateDashMpd(walkResult.audioFormats, {
        is_sabr: isSabr,
        isSabr: isSabr,
        durationMs: currentTrack.duration ? currentTrack.duration * 1000 : undefined,
        urlTransformer: (url) =>
          typeof this.networkAdapter.resolveStreamUrl === 'function'
            ? this.networkAdapter.resolveStreamUrl(url)
            : url,
      });

      // 3. Create blob URL for Shaka Player
      const manifestUrl = createDashBlobUrl(mpdXml);

      // 4. Load stream in audio driver
      await this.audioDriver.load(manifestUrl, startSeek);

      if (currentRequestId !== this.playRequestId) return;

      // 5. Start playback
      await this.audioDriver.play();

      // 6. Prefetch stream for the next track in queue for instant 0ms track skipping
      const nextTrack = this.queue[this.currentIndex + 1];
      if (nextTrack?.videoId) {
        prefetchStream(nextTrack.videoId, this.innerTube, this.verdictCache);
      }
    } catch (err: any) {
      if (currentRequestId !== this.playRequestId) return;
      this.playbackState = 'error';
      this.emit('stateChange', 'error');
      const error = new Error(`[PlayerEngine] Failed to play track "${currentTrack.title}": ${err?.message || err}`);
      this.emit('error', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    await this.audioDriver.pause();
  }

  async togglePlay(): Promise<void> {
    if (this.playbackState === 'playing') {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async seek(seconds: number): Promise<void> {
    await this.audioDriver.seek(seconds);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audioDriver.setVolume(this.volume);
    this.emit('volumeChange', this.volume);
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.duration;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getActiveClient(): InnerTubeClientName | null {
    return this.activeClient;
  }

  // --- Navigation & Modes ---

  hasNext(): boolean {
    if (this.isShuffle) return this.queue.length > 1;
    return this.currentIndex < this.queue.length - 1;
  }

  hasPrevious(): boolean {
    return this.currentIndex > 0;
  }

  async next(): Promise<void> {
    if (this.queue.length === 0) return;

    if (this.isShuffle && this.queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * this.queue.length);
      while (nextIdx === this.currentIndex && this.queue.length > 1) {
        nextIdx = Math.floor(Math.random() * this.queue.length);
      }
      await this.play(nextIdx);
      return;
    }

    if (this.currentIndex < this.queue.length - 1) {
      await this.play(this.currentIndex + 1);
    } else if (this.repeatMode === 'all') {
      await this.play(0);
    }
  }

  async previous(): Promise<void> {
    if (this.currentTime > 3) {
      await this.seek(0);
      return;
    }

    if (this.currentIndex > 0) {
      await this.play(this.currentIndex - 1);
    } else if (this.repeatMode === 'all' && this.queue.length > 0) {
      await this.play(this.queue.length - 1);
    } else {
      await this.seek(0);
    }
  }

  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  setShuffle(shuffle: boolean): void {
    this.isShuffle = shuffle;
  }

  getShuffle(): boolean {
    return this.isShuffle;
  }

  /**
   * Search YouTube / YouTube Music catalog
   */
  async search(query: string, clientName?: InnerTubeClientName): Promise<Track[]> {
    return this.innerTube.search(query, clientName);
  }

  /**
   * Fetch YouTube Music Home feed (mood chips, quick picks, shelves)
   */
  async getHomeFeed(moodParam?: string): Promise<HomeFeedData> {
    return this.innerTube.getHomeFeed(moodParam);
  }

  /**
   * Fetch Up Next radio queue and related content for videoId
   */
  async getNextRadio(videoId: string): Promise<NextRadioData> {
    return this.innerTube.getNextRadio(videoId);
  }

  async destroy(): Promise<void> {
    this.removeAllListeners();
    await this.audioDriver.destroy();
  }
}
