import {
  AudioFormat,
  ClientVerdict,
  InnerTubeClientName,
  PlayerResponse,
} from '../types';
import { InnerTubeClient } from '../innertube/client';

export const CLIENT_WALK_PRIORITY: readonly InnerTubeClientName[] = [
  'IOS',
  'VISIONOS',
  'WEB_REMIX',
  'WEB',
  'MWEB',
] as const;

export const BENCH_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const LOCAL_STORAGE_KEY = 'mp_verdict_cache';

export interface VerdictEntry {
  benchedUntil: number;
  reason: string;
}

/**
 * VerdictCache manages in-memory and optional localStorage benching of clients
 */
export class VerdictCache {
  private inMemoryCache: Map<InnerTubeClientName, VerdictEntry> = new Map();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, VerdictEntry>;
        const now = Date.now();
        for (const [key, entry] of Object.entries(parsed)) {
          if (entry && entry.benchedUntil > now) {
            this.inMemoryCache.set(key as InnerTubeClientName, entry);
          }
        }
      }
    } catch {
      // Storage access may be blocked or restricted; in-memory fallback continues
    }
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const obj: Record<string, VerdictEntry> = {};
      const now = Date.now();
      for (const [key, entry] of this.inMemoryCache.entries()) {
        if (entry.benchedUntil > now) {
          obj[key] = entry;
        }
      }
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore storage persistence errors
    }
  }

  /**
   * Check if a given client is currently benched
   */
  isBenched(client: InnerTubeClientName): boolean {
    const entry = this.inMemoryCache.get(client);
    if (!entry) return false;

    if (Date.now() < entry.benchedUntil) {
      return true;
    }

    // Expired bench
    this.inMemoryCache.delete(client);
    this.persistToStorage();
    return false;
  }

  /**
   * Bench a client for 10 minutes with a failure reason
   */
  bench(client: InnerTubeClientName, reason: string): void {
    const benchedUntil = Date.now() + BENCH_DURATION_MS;
    this.inMemoryCache.set(client, { benchedUntil, reason });
    this.persistToStorage();
  }

  /**
   * Remove bench for a single client
   */
  unbench(client: InnerTubeClientName): void {
    this.inMemoryCache.delete(client);
    this.persistToStorage();
  }

  /**
   * Clear all benched verdicts
   */
  clear(): void {
    this.inMemoryCache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Get active (non-benched) clients in priority order
   */
  getActiveClients(): InnerTubeClientName[] {
    return CLIENT_WALK_PRIORITY.filter((client) => !this.isBenched(client));
  }

  /**
   * Retrieve snapshot of all verdicts
   */
  getAllVerdicts(): Record<InnerTubeClientName, VerdictEntry | null> {
    const result = {} as Record<InnerTubeClientName, VerdictEntry | null>;
    for (const client of CLIENT_WALK_PRIORITY) {
      result[client] = this.isBenched(client) ? this.inMemoryCache.get(client)! : null;
    }
    return result;
  }
}

export interface ClientWalkResult {
  client: InnerTubeClientName;
  playerResponse: PlayerResponse;
  audioFormats: AudioFormat[];
  verdicts: ClientVerdict[];
  is_sabr?: boolean;
  isSabr?: boolean;
  serverAbrStreamingUrl?: string;
}

// 10-minute in-memory cache for resolved stream URLs
const STREAM_CACHE_TTL_MS = 10 * 60 * 1000;
interface CachedStreamEntry {
  expiresAt: number;
  result: ClientWalkResult;
}
const streamResultCache = new Map<string, CachedStreamEntry>();

/**
 * Invalidate in-memory stream cache for a specific videoId or all tracks
 */
export function invalidateStreamCache(videoId?: string): void {
  if (videoId) {
    streamResultCache.delete(videoId);
  } else {
    streamResultCache.clear();
  }
}

async function attemptClient(
  client: InnerTubeClientName,
  videoId: string,
  innerTubeClient: InnerTubeClient,
  cache: VerdictCache
): Promise<ClientWalkResult> {
  const response = await innerTubeClient.getPlayer(videoId, client);
  const status = response.playabilityStatus?.status;

  if (status !== 'OK') {
    const reason = response.playabilityStatus?.reason || `PlayabilityStatus: ${status}`;
    cache.bench(client, reason);
    throw new Error(reason);
  }

  const allFormats = [
    ...(response.streamingData?.formats || []),
    ...(response.streamingData?.adaptiveFormats || []),
  ];

  const serverAbrStreamingUrl =
    response.streamingData?.serverAbrStreamingUrl ||
    (response.streamingData as any)?.server_abr_streaming_url;

  // Check if response contains direct playable audio formats with URLs
  const hasDirectAudio = allFormats.some(
    (fmt) =>
      ([251, 250, 249, 140, 139, 171].includes(fmt.itag) || fmt.mimeType?.toLowerCase().startsWith('audio/')) &&
      Boolean(fmt.url)
  );

  // SABR is ONLY valid when formats do not have direct URLs and a serverAbrStreamingUrl exists
  const isSabrClient = !hasDirectAudio && Boolean(serverAbrStreamingUrl);

  const audioFormats = allFormats
    .filter((fmt) => {
      const isAudioMime = fmt.mimeType && fmt.mimeType.toLowerCase().startsWith('audio/');
      const isAudioItag = [251, 250, 249, 140, 139, 171].includes(fmt.itag);
      if (!isAudioMime && !isAudioItag) return false;
      // SABR formats do not require direct URL because they use the SABR protocol
      if (isSabrClient) return true;
      return Boolean(fmt.url);
    })
    .map((fmt) => {
      if (isSabrClient) {
        return {
          ...fmt,
          is_sabr: true,
          isSabr: true,
        };
      }
      return fmt;
    });

  if (audioFormats.length === 0) {
    const reason = isSabrClient
      ? 'No audio formats available in SABR streaming data'
      : 'No direct playable audio streams with direct URLs';
    cache.bench(client, reason);
    throw new Error(reason);
  }

  return {
    client,
    playerResponse: response,
    audioFormats,
    verdicts: [{ client, playable: true }],
    is_sabr: isSabrClient,
    isSabr: isSabrClient,
    serverAbrStreamingUrl,
  };
}

/**
 * Prefetch stream for an upcoming track in queue to ensure 0ms latency transition.
 */
export function prefetchStream(
  videoId: string,
  innerTubeClient: InnerTubeClient,
  cache: VerdictCache = new VerdictCache()
): void {
  const cached = streamResultCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return;
  executeClientWalk(videoId, innerTubeClient, cache).catch(() => {});
}

/**
 * Execute client walk with 10-minute stream caching and priority walking.
 * Prioritizes WEB_REMIX with SABR and VISIONOS with direct Opus/AAC.
 */
export async function executeClientWalk(
  videoId: string,
  innerTubeClient: InnerTubeClient,
  cache: VerdictCache = new VerdictCache()
): Promise<ClientWalkResult> {
  // 1. Check in-memory stream cache for instant 0ms playback
  const now = Date.now();
  const cached = streamResultCache.get(videoId);
  if (cached) {
    if (cached.expiresAt > now && !cache.isBenched(cached.result.client)) {
      return cached.result;
    }
    // Expired or benched client cache entry
    streamResultCache.delete(videoId);
  }

  let candidates = cache.getActiveClients();

  // If every client was benched, clear cache and try top priority again
  if (candidates.length === 0) {
    cache.clear();
    candidates = [...CLIENT_WALK_PRIORITY];
  }

  // 2. Iterate candidates in priority order (WEB_REMIX -> VISIONOS -> IOS -> WEB -> MWEB)
  const verdicts: ClientVerdict[] = [];

  for (const client of candidates) {
    try {
      const result = await attemptClient(client, videoId, innerTubeClient, cache);
      streamResultCache.set(videoId, { expiresAt: now + STREAM_CACHE_TTL_MS, result });
      return result;
    } catch (err: any) {
      verdicts.push({
        client,
        playable: false,
        reason: err?.message || 'Failed',
        benchedUntil: Date.now() + BENCH_DURATION_MS,
      });
    }
  }

  // All attempted clients failed
  const errorSummary = verdicts
    .map((v) => `${v.client}: ${v.reason || 'unplayable'}`)
    .join('; ');
  throw new Error(`[ClientWalk] All clients refused or failed for videoId "${videoId}": ${errorSummary}`);
}
