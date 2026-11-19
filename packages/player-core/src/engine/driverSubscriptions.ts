import { AudioDriver } from '../drivers/audio';
import { InnerTubeClient } from '../innertube/client';
import { NetworkAdapter } from '../adapters/network';
import {
  invalidateStreamCache,
  isStreamCached,
  prefetchAudioWarmup,
  prefetchStream,
  VerdictCache,
} from '../walk/clientWalk';
import { InnerTubeClientName, PlaybackState } from '../types';
import { QueueManager } from './queueManager';

export interface DriverCoordinatorDeps {
  audioDriver: AudioDriver;
  innerTube: InnerTubeClient;
  verdictCache: VerdictCache;
  networkAdapter: NetworkAdapter;
  queueManager: QueueManager;
  onStateChange: (state: PlaybackState) => void;
  onTimeUpdate: (time: number) => void;
  onRateChange: (rate: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
  onError: (err: Error) => void;
  getActiveClient: () => InnerTubeClientName | null;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  play: (index?: number, startTime?: number) => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
}

export function attachDriverCoordinator(deps: DriverCoordinatorDeps): {
  resetPrefetch: () => void;
  resetRecovery: () => void;
} {
  let prefetchedTrackId: string | null = null;
  let errorRecoveryAttempts = 0;
  const MAX_RECOVERY_ATTEMPTS = 3;

  const { audioDriver, innerTube, verdictCache, networkAdapter, queueManager } = deps;

  audioDriver.on('stateChange', (state) => deps.onStateChange(state));

  audioDriver.on('timeUpdate', (time) => {
    deps.onTimeUpdate(time);
    const duration = deps.getDuration();
    if (duration > 0 && time >= duration - 10) {
      const nextTrack = queueManager.getNextUpcomingTrack();
      if (nextTrack?.videoId && prefetchedTrackId !== nextTrack.videoId && !isStreamCached(nextTrack.videoId)) {
        prefetchedTrackId = nextTrack.videoId;
        prefetchStream(nextTrack.videoId, innerTube, verdictCache);
        prefetchAudioWarmup(nextTrack, networkAdapter, verdictCache).catch(() => {});
      }
    }
  });

  if (typeof (audioDriver as any).on === 'function') {
    audioDriver.on('rateChange', (rate: number) => {
      if (typeof rate === 'number' && deps.getPlaybackRate() !== rate) {
        deps.onRateChange(rate);
      }
    });
  }

  audioDriver.on('durationChange', (dur) => deps.onDurationChange(dur));

  audioDriver.on('ended', () => {
    deps.onEnded();
    if (queueManager.getRepeatMode() === 'one') {
      deps.seek(0).then(() => deps.play()).catch(deps.onError);
    } else if (queueManager.hasNext()) {
      deps.next().catch(deps.onError);
    } else if (queueManager.getRepeatMode() === 'all' && queueManager.getLength() > 0) {
      deps.play(0).catch(deps.onError);
    } else {
      deps.onStateChange('ended');
    }
  });

  audioDriver.on('error', (err) => {
    const currentTrack = queueManager.getCurrentTrack();
    const resumeTime = Math.max(0, deps.getCurrentTime());
    const activeClient = deps.getActiveClient();

    if (activeClient) {
      verdictCache.bench(activeClient, `mid-stream chunk stall/403: ${err.message}`);
    }
    if (currentTrack?.videoId) invalidateStreamCache(currentTrack.videoId);

    if (currentTrack?.videoId && errorRecoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
      errorRecoveryAttempts++;
      deps.onStateChange('buffering');
      deps.play(undefined, resumeTime).catch((recErr) => {
        deps.onStateChange('error');
        deps.onError(recErr || err);
      });
      return;
    }

    deps.onStateChange('error');
    deps.onError(err);
  });

  return {
    resetPrefetch: () => { prefetchedTrackId = null; },
    resetRecovery: () => { errorRecoveryAttempts = 0; },
  };
}
