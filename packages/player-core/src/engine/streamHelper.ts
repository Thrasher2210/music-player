import { ClientVerdict, InnerTubeClientName, Track } from '../types';
import { NetworkAdapter } from '../adapters/network';
import { InnerTubeClient } from '../innertube/client';
import { executeClientWalk, VerdictCache } from '../walk/clientWalk';
import { createDashBlobUrl, createDashDataUri, generateDashMpd } from '../manifest/dashGenerator';
import { AudioDriver } from '../drivers/audio';

export interface PreparedStream {
  manifestUrl: string;
  client: InnerTubeClientName;
  verdicts: ClientVerdict[];
  updatedDuration?: number;
  sabrConfig?: any;
}

export function enrichTrackMetadata(track: Track, videoDetails: any): { changed: boolean; newDuration?: number } {
  if (!videoDetails) return { changed: false };
  let changed = false;
  let newDuration: number | undefined;

  if (!track.title || track.title === 'Loading...') {
    track.title = videoDetails.title || track.title;
    changed = true;
  }
  if (!track.artist || track.artist === 'YouTube Music') {
    track.artist = videoDetails.author || track.artist;
    changed = true;
  }
  if (videoDetails.lengthSeconds) {
    const sec = parseInt(videoDetails.lengthSeconds, 10);
    if (!isNaN(sec) && sec > 0 && (!track.duration || track.duration === 180)) {
      track.duration = sec;
      newDuration = sec;
      changed = true;
    }
  }
  const thumbs = videoDetails.thumbnail?.thumbnails;
  if (thumbs && thumbs.length > 0 && (!track.thumbnail || track.thumbnail === '')) {
    track.thumbnail = thumbs[thumbs.length - 1].url;
    track.thumbnails = thumbs;
    changed = true;
  }

  return { changed, newDuration };
}

export async function prepareTrackStream(
  currentTrack: Track,
  innerTube: InnerTubeClient,
  verdictCache: VerdictCache,
  networkAdapter: NetworkAdapter,
  audioDriver: AudioDriver
): Promise<PreparedStream> {
  const walkResult = await executeClientWalk(currentTrack.videoId, innerTube, verdictCache);

  const details = (walkResult.playerResponse as any)?.videoDetails;
  const { newDuration } = enrichTrackMetadata(currentTrack, details);

  const serverAbrStreamingUrl =
    walkResult.serverAbrStreamingUrl ||
    walkResult.playerResponse.streamingData?.serverAbrStreamingUrl ||
    (walkResult.playerResponse.streamingData as any)?.server_abr_streaming_url;

  const isSabr = Boolean(
    (walkResult.is_sabr || walkResult.isSabr) &&
    serverAbrStreamingUrl
  );

  const sabrConfig = isSabr && serverAbrStreamingUrl ? {
    serverAbrStreamingUrl,
    ustreamerConfig:
      (walkResult.playerResponse as any)?.playerConfig?.mediaCommonConfig?.mediaUstreamerRequestConfig?.videoPlaybackUstreamerConfig ||
      (walkResult.playerResponse as any)?.videoPlaybackUstreamerConfig ||
      'CAE=',
    formats: walkResult.audioFormats,
  } : undefined;

  if (typeof (audioDriver as any).configureSabr === 'function' && sabrConfig) {
    (audioDriver as any).configureSabr(sabrConfig);
  }

  const mpdXml = generateDashMpd(walkResult.audioFormats, {
    is_sabr: isSabr,
    isSabr: isSabr,
    durationMs: currentTrack.duration ? currentTrack.duration * 1000 : undefined,
    urlTransformer: (url) =>
      typeof networkAdapter.resolveStreamUrl === 'function'
        ? networkAdapter.resolveStreamUrl(url, currentTrack.videoId)
        : url,
  });

  const manifestUrl = createDashDataUri(mpdXml);

  return {
    manifestUrl,
    client: walkResult.client,
    verdicts: walkResult.verdicts,
    updatedDuration: newDuration,
    sabrConfig,
  };
}

export async function loadAndPlayPreparedTrack(
  currentTrack: Track,
  innerTube: InnerTubeClient,
  verdictCache: VerdictCache,
  networkAdapter: NetworkAdapter,
  audioDriver: AudioDriver,
  startSeek: number
): Promise<PreparedStream> {
  const prep = await prepareTrackStream(
    currentTrack,
    innerTube,
    verdictCache,
    networkAdapter,
    audioDriver
  );
  await (audioDriver as any).load(prep.manifestUrl, startSeek, prep.sabrConfig);
  await audioDriver.play();
  return prep;
}
