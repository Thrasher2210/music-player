import {
  AudioFormat,
  ClientVerdict,
  InnerTubeClientName,
  PlayerResponse,
  Track,
} from '../types';
import { InnerTubeClient } from '../innertube/client';
import { NetworkAdapter } from '../adapters/network';
import {
  CLIENT_WALK_PRIORITY,
  BENCH_DURATION_MS,
  VerdictCache,
  STREAM_CACHE_TTL_MS,
  streamResultCache,
  inFlightPrefetches,
  isStreamCached,
} from './cache';

export * from './cache';

export interface ClientWalkResult {
  client: InnerTubeClientName;
  playerResponse: PlayerResponse;
  audioFormats: AudioFormat[];
  verdicts: ClientVerdict[];
  is_sabr?: boolean;
  isSabr?: boolean;
  serverAbrStreamingUrl?: string;
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
  if (isStreamCached(videoId) || inFlightPrefetches.has(videoId)) return;
  inFlightPrefetches.add(videoId);
  executeClientWalk(videoId, innerTubeClient, cache)
    .catch(() => {})
    .finally(() => {
      inFlightPrefetches.delete(videoId);
    });
}

/**
 * Resolves stream URLs and fetches the first 256KB range (bytes=0-262143)
 * to warm the cache for instant <50ms track transitions.
 */
export async function prefetchAudioWarmup(
  track: Track,
  networkAdapter: NetworkAdapter,
  cache?: VerdictCache
): Promise<void> {
  if (!track || !track.videoId) return;

  const innerTubeClient = new InnerTubeClient({ networkAdapter });
  const verdictCache = cache || new VerdictCache();
  const walkResult = await executeClientWalk(track.videoId, innerTubeClient, verdictCache);

  const targetFormat =
    walkResult.audioFormats.find((f) => Boolean(f.url)) || walkResult.audioFormats[0];

  if (targetFormat?.url) {
    const streamUrl =
      typeof networkAdapter.resolveStreamUrl === 'function'
        ? networkAdapter.resolveStreamUrl(targetFormat.url)
        : targetFormat.url;

    await networkAdapter.fetch(streamUrl, {
      headers: {
        Range: 'bytes=0-262143',
      },
    });
  }
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

  // If the filtered candidates failed but some clients were previously benched, retry all clients fresh once
  if (candidates.length < CLIENT_WALK_PRIORITY.length) {
    cache.clear();
    const remaining = CLIENT_WALK_PRIORITY.filter((c) => !candidates.includes(c));
    for (const client of remaining) {
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
  }

  // All attempted clients failed
  const errorSummary = verdicts
    .map((v) => `${v.client}: ${v.reason || 'unplayable'}`)
    .join('; ');
  throw new Error(`[ClientWalk] All clients refused or failed for videoId "${videoId}": ${errorSummary}`);
}
