import type shaka from 'shaka-player';
import { AudioFormat, PlaybackState } from '../types';

export type ShakaPlayerInstance = InstanceType<typeof shaka.Player>;

export type AudioPlaybackState = PlaybackState;

export interface AudioDriverEvents {
  timeUpdate: (time: number) => void;
  durationChange: (duration: number) => void;
  stateChange: (state: AudioPlaybackState) => void;
  rateChange: (rate: number) => void;
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
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getCurrentTime(): number;
  getDuration(): number;
  isPaused(): boolean;
  getState(): AudioPlaybackState;
  hasLoadedStream?(): boolean;
  configureSabr?(config: SabrStreamConfig): void;
  on<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): () => void;
  off<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): void;
}
