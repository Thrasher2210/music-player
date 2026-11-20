import type { Track } from '@mp/player-core';
import { PlayCounter } from './playCounter';

export interface HistoryRecorder {
  trackChange: (track: Track | null) => void;
  timeUpdate: (time: number, duration: number) => void;
  ended: () => void;
}

/** Turns engine events into one `record` call per counted play. */
export function createHistoryRecorder(
  record: (track: Track, msPlayed: number) => void,
  counter: PlayCounter = new PlayCounter()
): HistoryRecorder {
  let current: Track | null = null;

  return {
    trackChange(track) {
      current = track;
      counter.load(track?.videoId || null);
    },
    timeUpdate(time, duration) {
      if (!current) return;
      const msPlayed = counter.tick(time, duration);
      if (msPlayed !== null) record(current, msPlayed);
    },
    ended() {
      counter.replay();
    },
  };
}

/** Saves a counted play for signed in users. Guests and failures are ignored, playback never waits on it. */
export async function recordPlay(track: Track, msPlayed: number): Promise<void> {
  try {
    const { useAuthStore } = await import('../authStore');
    if (!useAuthStore.getState().isAuthenticated) return;
    const { useLibraryStore } = await import('../libraryStore');
    await useLibraryStore.getState().recordPlayHistory(track, msPlayed);
  } catch {
    // History is best effort and must not surface errors in the player
  }
}
