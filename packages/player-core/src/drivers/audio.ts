import type shaka from 'shaka-player';
import {
  SabrStreamingAdapter,
  SabrUmpProcessor,
  type SabrPlayerAdapter,
  type PlayerHttpRequest,
  type PlayerHttpResponse,
  type RequestFilter,
  type ResponseFilter,
} from 'googlevideo/sabr-streaming-adapter';
import { buildSabrFormat, createFormatKey } from 'googlevideo/utils';
import type { CacheManager, RequestMetadataManager } from 'googlevideo/utils';
import { AudioFormat, PlaybackState } from '../types';

export type ShakaPlayerInstance = InstanceType<typeof shaka.Player>;

export type AudioPlaybackState = PlaybackState;

export interface AudioDriverEvents {
  timeUpdate: (time: number) => void;
  durationChange: (duration: number) => void;
  stateChange: (state: AudioPlaybackState) => void;
  ended: () => void;
  error: (error: Error) => void;
}

export interface SabrStreamConfig {
  serverAbrStreamingUrl?: string;
  ustreamerConfig?: string;
  formats?: AudioFormat[];
}

export interface AudioDriver {
  readonly name: string;
  initialize(mediaElement?: HTMLMediaElement): Promise<void>;
  destroy(): Promise<void>;
  load(src: string, startTime?: number, sabrConfig?: SabrStreamConfig): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(time: number): Promise<void>;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  isPaused(): boolean;
  getState(): AudioPlaybackState;
  configureSabr?(config: SabrStreamConfig): void;
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
 * ShakaPlayerAdapter bridges Shaka Player's NetworkingEngine with googlevideo's
 * SabrStreamingAdapter and SabrUmpProcessor for seamless YouTube Music streaming.
 */
export class ShakaPlayerAdapter implements SabrPlayerAdapter {
  private player: ShakaPlayerInstance | null = null;
  private mediaElementGetter: () => HTMLMediaElement | null;
  private requestMetadataManager: RequestMetadataManager | null = null;
  private cache: CacheManager | null = null;
  private requestInterceptor: RequestFilter | null = null;
  private responseInterceptor: ResponseFilter | null = null;
  private filtersRegistered = false;
  public sabrAdapter: any = null;

  constructor(player: ShakaPlayerInstance | null, mediaElementGetter: () => HTMLMediaElement | null) {
    this.player = player;
    this.mediaElementGetter = mediaElementGetter;
  }

  setSabrAdapter(adapter: any): void {
    this.sabrAdapter = adapter;
  }

  setPlayer(player: ShakaPlayerInstance | null): void {
    this.player = player;
    this.filtersRegistered = false;
    if (player && (this.requestInterceptor || this.responseInterceptor)) {
      this.attachFiltersToPlayer(player);
    }
  }

  initialize(player: any, requestMetadataManager: RequestMetadataManager, cache: CacheManager | null): void {
    this.player = player;
    this.requestMetadataManager = requestMetadataManager;
    this.cache = cache;
    if (player) {
      this.attachFiltersToPlayer(player);
    }
  }

  getPlayerTime(): number {
    const el = this.mediaElementGetter();
    return el ? el.currentTime || 0 : 0;
  }

  getPlaybackRate(): number {
    const el = this.mediaElementGetter();
    return el ? el.playbackRate || 1 : 1;
  }

  getBandwidthEstimate(): number {
    if (this.player) {
      try {
        const stats = (this.player as any).getStats?.();
        if (stats && typeof stats.estimatedBandwidth === 'number') {
          return stats.estimatedBandwidth;
        }
      } catch {
        // Fallback estimate
      }
    }
    return 128000;
  }

  getActiveTrackFormats(activeFormat: any, _sabrFormats: any[]): { audioFormat?: any; videoFormat?: any } {
    return {
      audioFormat: activeFormat,
      videoFormat: undefined,
    };
  }

  registerRequestInterceptor(interceptor: RequestFilter): void {
    this.requestInterceptor = interceptor;
    if (this.player) {
      this.attachFiltersToPlayer(this.player);
    }
  }

  registerResponseInterceptor(interceptor: ResponseFilter): void {
    this.responseInterceptor = interceptor;
    if (this.player) {
      this.attachFiltersToPlayer(this.player);
    }
  }

  attachFiltersToPlayer(player: ShakaPlayerInstance): void {
    this.player = player;
    if (this.filtersRegistered) return;

    const netEngine = (player as any).getNetworkingEngine?.();
    if (!netEngine) return;

    this.filtersRegistered = true;

    // Shaka Request Filter for SABR URLs
    netEngine.registerRequestFilter(async (type: any, request: any, context?: any) => {
      if (!this.requestInterceptor) return;

      const url = request.uris && request.uris[0];
      if (!url) return;

      const isSabrUri = url.startsWith('sabr:');
      if (!isSabrUri && !url.includes('ump=1')) {
        return;
      }

      const rangeHeader = request.headers?.['Range'] || request.headers?.['range'];
      const isInit =
        type === 3 || // SEGMENT_INFO
        (typeof rangeHeader === 'string' && /^bytes=0-\d+$/.test(rangeHeader)) ||
        url.includes('init') ||
        Boolean(context?.isInit);

      const playerReq: PlayerHttpRequest = {
        url,
        method: request.method || 'GET',
        headers: { ...(request.headers || {}) },
        body: request.body,
        segment: {
          getStartTime: () => {
            if (typeof context?.startTime === 'number') return context.startTime;
            return this.getPlayerTime();
          },
          isInit: () => isInit,
        },
      };

      if (!(this.sabrAdapter as any)?.streamingURL) {
        console.warn('[ShakaPlayerAdapter] Server ABR URL not set, skipping SABR request interceptor');
        return;
      }

      try {
        const modified = await this.requestInterceptor(playerReq);
        if (modified) {
          request.uris = [modified.url];
          request.method = modified.method;
          request.headers = modified.headers;
          if (modified.body !== undefined) {
            request.body = modified.body;
          }
        }
      } catch (err) {
        console.error('[ShakaPlayerAdapter] Error in SABR request interceptor:', err);
      }
    });

    // Shaka Response Filter for UMP chunk decoding and metadata tracking
    netEngine.registerResponseFilter(async (type: any, response: any, _context?: any) => {
      if (!this.responseInterceptor) return;

      const uri = response.uri || (response as any).originalUri;
      if (!uri) return;

      const metadata = this.requestMetadataManager?.getRequestMetadata(uri, false);
      if (!metadata) return;

      // Unpack UMP format into raw audio container bytes
      if (metadata.isUMP && response.data) {
        try {
          const processor = new SabrUmpProcessor(metadata, this.cache ?? undefined);
          const rawBytes =
            response.data instanceof Uint8Array
              ? response.data
              : new Uint8Array(response.data);

          const result = await processor.processChunk(rawBytes);
          if (result?.data) {
            response.data = result.data.buffer.slice(
              result.data.byteOffset,
              result.data.byteOffset + result.data.byteLength
            );
          }
        } catch (umpErr) {
          console.error('[ShakaPlayerAdapter] Error processing UMP chunk:', umpErr);
        }
      }

      const playerResp: PlayerHttpResponse = {
        url: uri,
        method: 'POST',
        headers: response.headers || {},
        data: response.data,
        makeRequest: async (followupUrl: string, followupHeaders: Record<string, string>) => {
          const res = await fetch(followupUrl, { headers: followupHeaders });
          const buf = await res.arrayBuffer();
          const respHeaders: Record<string, string> = {};
          res.headers.forEach((v, k) => {
            respHeaders[k] = v;
          });
          return {
            url: followupUrl,
            method: 'GET',
            headers: respHeaders,
            data: buf,
          };
        },
      };

      try {
        const modified = await this.responseInterceptor(playerResp);
        if (modified?.data) {
          response.data = modified.data;
        }
      } catch (respErr) {
        console.error('[ShakaPlayerAdapter] Error in SABR response interceptor:', respErr);
      }
    });
  }

  dispose(): void {
    this.requestInterceptor = null;
    this.responseInterceptor = null;
    this.player = null;
    this.requestMetadataManager = null;
    this.cache = null;
    this.filtersRegistered = false;
  }
}

/**
 * ShakaMseAudioDriver: Headless Shaka Player wrapping MediaSource Extensions (MSE)
 * Configured specifically for byte-range googlevideo audio streaming with SabrStreamingAdapter
 * to completely eliminate 403 chunk stall/stutter loops on YouTube audio streams.
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

  private sabrAdapter: SabrStreamingAdapter | null = null;
  private sabrPlayerAdapter: ShakaPlayerAdapter | null = null;

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

    const player = new shaka.Player();
    this.player = player;
    await (player as any).attach(this.mediaElement);

    // Initialize SabrStreamingAdapter and attach to Shaka Player
    this.sabrPlayerAdapter = new ShakaPlayerAdapter(player, () => this.mediaElement);
    this.sabrAdapter = new SabrStreamingAdapter({
      playerAdapter: this.sabrPlayerAdapter,
      enableCaching: true,
      maxCacheSizeMB: 10,
      maxCacheAgeSeconds: 600,
    });
    this.sabrPlayerAdapter.setSabrAdapter(this.sabrAdapter);
    this.sabrAdapter.attach(player);
    this.sabrPlayerAdapter.attachFiltersToPlayer(player);

    // Configure Shaka for ultra-fast instant audio start & byte-range chunks
    (this.player as any).configure({
      streaming: {
        bufferingGoal: 12,
        rebufferingGoal: 0.3, // starts playing as soon as 300ms chunk lands in MSE
        bufferBehind: 15,
        retryParameters: {
          maxAttempts: 3,
          baseDelay: 300,
          backoffFactor: 1.5,
          fuzzFactor: 0.2,
          timeout: 10000,
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

  /**
   * Configures SABR streaming parameters (streaming URL, ustreamer config, formats)
   */
  configureSabr(config: SabrStreamConfig): void {
    if (!this.sabrAdapter) return;

    if (config.serverAbrStreamingUrl) {
      this.sabrAdapter.setStreamingURL(config.serverAbrStreamingUrl);
    }
    if (config.ustreamerConfig) {
      this.sabrAdapter.setUstreamerConfig(config.ustreamerConfig);
    }
    if (config.formats && config.formats.length > 0) {
      const sabrFormats = config.formats.map((f) => buildSabrFormat(f as any));
      this.sabrAdapter.setServerAbrFormats(sabrFormats);
    }
  }

  getSabrAdapter(): SabrStreamingAdapter | null {
    return this.sabrAdapter;
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

  async load(src: string, startTime: number = 0, sabrConfig?: SabrStreamConfig): Promise<void> {
    if (!this.player) {
      await this.initialize();
    }

    if (!this.player) {
      throw new Error('[ShakaMseAudioDriver] Player is not initialized');
    }

    if (sabrConfig) {
      this.configureSabr(sabrConfig);
    }

    // If recovering from a stream/network error, re-attach mediaElement to clear broken MediaSource
    if (this.state === 'error' && this.player && this.mediaElement) {
      try {
        await (this.player as any).unload();
        await (this.player as any).detach();
        await (this.player as any).attach(this.mediaElement);
        if (this.sabrPlayerAdapter) {
          this.sabrPlayerAdapter.attachFiltersToPlayer(this.player!);
        }
      } catch {
        // Fallback: continue loading
      }
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

    if (this.sabrAdapter) {
      try {
        this.sabrAdapter.dispose();
      } catch {
        // Ignore
      }
      this.sabrAdapter = null;
    }

    if (this.sabrPlayerAdapter) {
      this.sabrPlayerAdapter.dispose();
      this.sabrPlayerAdapter = null;
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

export { buildSabrFormat, createFormatKey };
