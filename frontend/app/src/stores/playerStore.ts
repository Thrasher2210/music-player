'use client';

import { create } from 'zustand';
import {
  type Track,
  type NetworkAdapterType,
  type StreamingStatus,
  type SleepTimerMode,
  type DiagnosticInfo,
  type PlayerStoreState,
  toTrackData,
} from './player/types';
import { createPlaybackSlice } from './player/playbackSlice';
import { createQueueSlice } from './player/queueSlice';
import { createDiagnosticsSlice } from './player/diagnosticsSlice';

export type {
  Track,
  NetworkAdapterType,
  StreamingStatus,
  SleepTimerMode,
  DiagnosticInfo,
  PlayerStoreState,
};
export { toTrackData };

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  ...createPlaybackSlice(set, get),
  ...createQueueSlice(set, get),
  ...createDiagnosticsSlice(set, get),
}));
