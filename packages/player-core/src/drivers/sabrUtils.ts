import {
  SabrUmpProcessor,
  type SabrPlayerAdapter,
  type PlayerHttpRequest,
  type PlayerHttpResponse,
  type RequestFilter,
  type ResponseFilter,
} from 'googlevideo/sabr-streaming-adapter';
import { buildSabrFormat, createFormatKey } from 'googlevideo/utils';
import type { CacheManager, RequestMetadataManager } from 'googlevideo/utils';
import { ShakaPlayerInstance } from './types';

// Lazy loader for shaka-player ensuring SSR/Node compatibility
let shakaModulePromise: Promise<any> | null = null;
export async function getShaka(): Promise<any> {
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

export { buildSabrFormat, createFormatKey };
