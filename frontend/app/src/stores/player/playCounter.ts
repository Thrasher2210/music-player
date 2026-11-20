export interface PlayCounterOptions {
  /** Seconds of playback after which a play counts. */
  minSeconds?: number;
  /** Fraction of the track after which a play counts, for tracks shorter than twice `minSeconds`. */
  minFraction?: number;
  /** Largest time step still treated as playback; anything bigger is a seek. */
  maxStepSeconds?: number;
}

/**
 * Decides when a listen counts as a play: after `minSeconds` of actual playback or
 * `minFraction` of the track, whichever comes first. Seeking does not add playback time.
 */
export class PlayCounter {
  private readonly minSeconds: number;
  private readonly minFraction: number;
  private readonly maxStepSeconds: number;

  private videoId: string | null = null;
  private played = 0;
  private lastTime: number | null = null;
  private counted = false;

  constructor({ minSeconds = 30, minFraction = 0.5, maxStepSeconds = 5 }: PlayCounterOptions = {}) {
    this.minSeconds = minSeconds;
    this.minFraction = minFraction;
    this.maxStepSeconds = maxStepSeconds;
  }

  /** Starts counting a track. Loading the track that is already being counted changes nothing. */
  load(videoId: string | null): void {
    if (videoId === this.videoId) return;
    this.restart(videoId);
  }

  /** Counts the current track again from zero, e.g. after it ended and plays once more. */
  replay(): void {
    this.restart(this.videoId);
  }

  /** Feeds a playback position. Returns the milliseconds listened the first time a play counts. */
  tick(time: number, duration: number): number | null {
    if (this.videoId === null) return null;

    const previous = this.lastTime;
    this.lastTime = time;
    if (previous !== null) {
      const step = time - previous;
      if (step > 0 && step <= this.maxStepSeconds) this.played += step;
    }

    if (this.counted || this.played < this.threshold(duration)) return null;
    this.counted = true;
    return Math.round(this.played * 1000);
  }

  private threshold(duration: number): number {
    return duration > 0 ? Math.min(this.minSeconds, duration * this.minFraction) : this.minSeconds;
  }

  private restart(videoId: string | null): void {
    this.videoId = videoId;
    this.played = 0;
    this.lastTime = null;
    this.counted = false;
  }
}
