import {
  ClientVerdict,
  InnerTubeClientName,
  PlaybackState,
  Track,
} from '../types';
import { NetworkAdapter } from '../adapters/network';
import { AudioDriver } from '../drivers/audio';

export interface PlayerEngineEvents extends Record<string, (...args: any[]) => void> {
  stateChange: (state: PlaybackState) => void;
  trackChange: (track: Track | null, index: number) => void;
  timeUpdate: (currentTime: number) => void;
  durationChange: (duration: number) => void;
  volumeChange: (volume: number) => void;
  playbackRateChange: (rate: number) => void;
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
