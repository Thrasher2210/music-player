import type shaka from 'shaka-player';
import { PlaybackState } from '../types';

export type ShakaPlayerInstance = InstanceType<typeof shaka.Player>;

export type AudioPlaybackState = PlaybackState;

export interface AudioDriverEvents {
  timeUpdate: (time: number) => void;
  durationChange: (duration: number) => void;
  stateChange: (state: AudioPlaybackState) => void;
  ended: () => void;
  error: (error: Error) => void;
}

export interface AudioDriver {
  readonly name: string;
  initialize(mediaElement?: HTMLMediaElement): Promise<void>;
  destroy(): Promise<void>;
  load(src: string, startTime?: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(time: number): Promise<void>;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  isPaused(): boolean;
  getState(): AudioPlaybackState;
  on<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): () => void;
  off<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): void;
}

// Lazy loader for shaka-player ensuring SSR/Node compatibility
let shakaModulePromise: Promise<any> | null = null;
async function getShaka(): Promise<any> {
  if (!shakaModulePromise) {
    shakaModulePromise = (async () => {
      if (typeof self === 'undefined' && typeof globalThis !== 'undefined') {
        (globalThis as any).self = globalThis;
      }
      const mod = await import('shaka-player');
      return mod.default || mod;
    })();
  }
  return shakaModulePromise;
}

/**
 * ShakaMseAudioDriver: Headless Shaka Player wrapping MediaSource Extensions (MSE)
 * Configured specifically for byte-range googlevideo audio streaming to eliminate
 * the 70s throttling stall encountered with standard <audio> tag src loading.
 */
export class ShakaMseAudioDriver implements AudioDriver {
  readonly name = 'shaka-mse';

  private player: ShakaPlayerInstance | null = null;
  private mediaElement: HTMLMediaElement | null = null;
  private isHeadlessMedia = false;
  private state: AudioPlaybackState = 'idle';
  private listeners: { [E in keyof AudioDriverEvents]?: Set<AudioDriverEvents[E]> } = {};
  private activeBlobUrl: string | null = null;
  private boundElementListeners: Array<{ type: string; listener: EventListener }> = [];

  constructor() {}

  async initialize(mediaElement?: HTMLMediaElement): Promise<void> {
    if (this.player) {
      return;
    }

    if (mediaElement) {
      this.mediaElement = mediaElement;
      this.isHeadlessMedia = false;
    } else if (typeof document !== 'undefined') {
      this.mediaElement = document.createElement('audio');
      this.mediaElement.preload = 'auto';
      this.isHeadlessMedia = true;
    } else {
      // In headless SSR or Node test environments without DOM
      this.state = 'idle';
      return;
    }

    const shaka = await getShaka();

    // Install Shaka polyfills for MediaSource & browser quirks
    if (typeof shaka.polyfill !== 'undefined' && typeof shaka.polyfill.installAll === 'function') {
      shaka.polyfill.installAll();
    }

    if (typeof shaka.Player?.isBrowserSupported === 'function' && !shaka.Player.isBrowserSupported()) {
      const err = new Error('[ShakaMseAudioDriver] Browser does not support Shaka Player MSE');
      this.emit('error', err);
      throw err;
    }

    this.player = new shaka.Player();
    await (this.player as any).attach(this.mediaElement);

    // Configure Shaka for optimal audio streaming & byte-range chunks
    (this.player as any).configure({
      streaming: {
        bufferingGoal: 30, // 30s lookahead prevents googlevideo aggressive bandwidth drop-off
        rebufferingGoal: 2,
        bufferBehind: 30,
        retryParameters: {
          maxAttempts: 3,
          baseDelay: 1000,
          backoffFactor: 2,
          fuzzFactor: 0.5,
          timeout: 20000,
        },
      },
      manifest: {
        dash: {
          ignoreMinBufferTime: true,
          autoCorrectDrift: true,
        },
      },
    });

    this.attachEventListeners();
    this.setState('idle');
  }

  private attachEventListeners(): void {
    if (!this.mediaElement) return;

    const addElListener = (type: string, listener: EventListener) => {
      this.mediaElement!.addEventListener(type, listener);
      this.boundElementListeners.push({ type, listener });
    };

    addElListener('timeupdate', () => {
      if (this.mediaElement) {
        this.emit('timeUpdate', this.mediaElement.currentTime);
      }
    });

    addElListener('durationchange', () => {
      if (this.mediaElement) {
        this.emit('durationChange', this.mediaElement.duration || 0);
      }
    });

    addElListener('play', () => {
      this.setState('playing');
    });

    addElListener('pause', () => {
      if (this.state !== 'ended' && this.state !== 'error') {
        this.setState('paused');
      }
    });

    addElListener('waiting', () => {
      this.setState('buffering');
    });

    addElListener('playing', () => {
      this.setState('playing');
    });

    addElListener('ended', () => {
      this.setState('ended');
      this.emit('ended');
    });

    addElListener('error', () => {
      const mediaErr = this.mediaElement?.error;
      const error = new Error(`[MediaElement Error] Code ${mediaErr?.code}: ${mediaErr?.message}`);
      this.setState('error');
      this.emit('error', error);
    });

    if (this.player) {
      (this.player as any).addEventListener('error', (event: any) => {
        const detail = event?.detail;
        const err = new Error(`[Shaka Error ${detail?.code}] ${detail?.message || 'Playback error'}`);
        this.setState('error');
        this.emit('error', err);
      });

      (this.player as any).addEventListener('buffering', (event: any) => {
        if (event?.buffering) {
          this.setState('buffering');
        } else if (this.mediaElement && !this.mediaElement.paused) {
          this.setState('playing');
        }
      });
    }
  }

  private detachEventListeners(): void {
    if (this.mediaElement) {
      for (const { type, listener } of this.boundElementListeners) {
        this.mediaElement.removeEventListener(type, listener);
      }
    }
    this.boundElementListeners = [];
  }

  private setState(newState: AudioPlaybackState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChange', newState);
    }
  }

  async load(src: string, startTime: number = 0): Promise<void> {
    if (!this.player) {
      await this.initialize();
    }

    if (!this.player) {
      throw new Error('[ShakaMseAudioDriver] Player is not initialized');
    }

    // Clean up previous blob URL if needed
    if (this.activeBlobUrl && this.activeBlobUrl.startsWith('blob:') && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch {
        // Ignore revoke errors
      }
      this.activeBlobUrl = null;
    }

    if (src.startsWith('blob:')) {
      this.activeBlobUrl = src;
    }

    this.setState('loading');

    try {
      await (this.player as any).load(src, startTime);
      this.setState('paused');
    } catch (err: any) {
      this.setState('error');
      const error = new Error(`[ShakaMseAudioDriver] Failed to load stream: ${err?.message || err}`);
      this.emit('error', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.mediaElement) return;
    try {
      await this.mediaElement.play();
    } catch (err: any) {
      // AbortError can occur if play() is quickly interrupted by pause()
      if (err?.name !== 'AbortError') {
        this.setState('error');
        this.emit('error', err);
        throw err;
      }
    }
  }

  async pause(): Promise<void> {
    if (!this.mediaElement) return;
    this.mediaElement.pause();
  }

  async seek(time: number): Promise<void> {
    if (!this.mediaElement) return;
    const duration = this.getDuration();
    const clampedTime = Math.max(0, duration > 0 ? Math.min(time, duration) : time);
    this.mediaElement.currentTime = clampedTime;
  }

  setVolume(volume: number): void {
    if (!this.mediaElement) return;
    this.mediaElement.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.mediaElement ? this.mediaElement.volume : 1;
  }

  getCurrentTime(): number {
    return this.mediaElement ? this.mediaElement.currentTime : 0;
  }

  getDuration(): number {
    return this.mediaElement && !isNaN(this.mediaElement.duration)
      ? this.mediaElement.duration
      : 0;
  }

  isPaused(): boolean {
    return this.mediaElement ? this.mediaElement.paused : true;
  }

  getState(): AudioPlaybackState {
    return this.state;
  }

  on<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    this.listeners[event]!.add(listener);
    return () => this.off(event, listener);
  }

  off<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): void {
    this.listeners[event]?.delete(listener);
  }

  private emit<E extends keyof AudioDriverEvents>(
    event: E,
    ...args: Parameters<AudioDriverEvents[E]>
  ): void {
    const handlers = this.listeners[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          (handler as any)(...args);
        } catch (e) {
          console.error(`[ShakaMseAudioDriver] Error in event listener for ${event}:`, e);
        }
      }
    }
  }

  async destroy(): Promise<void> {
    this.detachEventListeners();

    if (this.activeBlobUrl && this.activeBlobUrl.startsWith('blob:') && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch {
        // Ignore
      }
      this.activeBlobUrl = null;
    }

    if (this.player) {
      try {
        await (this.player as any).destroy();
      } catch {
        // Ignore destroy errors
      }
      this.player = null;
    }

    if (this.mediaElement && this.isHeadlessMedia) {
      this.mediaElement.src = '';
      this.mediaElement.load();
      this.mediaElement = null;
    }

    this.listeners = {};
    this.setState('idle');
  }
}
