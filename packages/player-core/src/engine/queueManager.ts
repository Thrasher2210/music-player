import { RepeatMode, Track } from '../types';

export class QueueManager {
  private queue: Track[] = [];
  private currentIndex = -1;
  private repeatMode: RepeatMode = 'off';
  private isShuffle = false;

  getQueue(): Track[] {
    return [...this.queue];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  setCurrentIndex(index: number): void {
    this.currentIndex = index;
  }

  getCurrentTrack(): Track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  getTrackAt(index: number): Track | null {
    if (index >= 0 && index < this.queue.length) {
      return this.queue[index];
    }
    return null;
  }

  setQueue(
    tracks: Track[],
    startIndex = 0
  ): { selectedIndex: number; selectedTrack: Track | null } {
    this.queue = [...tracks];
    if (this.queue.length > 0) {
      this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
      return { selectedIndex: this.currentIndex, selectedTrack: this.queue[this.currentIndex] };
    }
    this.currentIndex = -1;
    return { selectedIndex: -1, selectedTrack: null };
  }

  addToQueue(track: Track): { isFirst: boolean } {
    this.queue.push(track);
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
      return { isFirst: true };
    }
    return { isFirst: false };
  }

  removeFromQueue(index: number): {
    removed: boolean;
    nextAction: 'none' | 'stop' | 'playNext' | 'shifted';
    nextIndex: number;
  } {
    if (index < 0 || index >= this.queue.length) {
      return { removed: false, nextAction: 'none', nextIndex: this.currentIndex };
    }
    this.queue.splice(index, 1);

    if (index === this.currentIndex) {
      if (this.queue.length === 0) {
        this.currentIndex = -1;
        return { removed: true, nextAction: 'stop', nextIndex: -1 };
      }
      const nextIndex = Math.min(index, this.queue.length - 1);
      return { removed: true, nextAction: 'playNext', nextIndex };
    } else if (index < this.currentIndex) {
      this.currentIndex--;
      return { removed: true, nextAction: 'shifted', nextIndex: this.currentIndex };
    }
    return { removed: true, nextAction: 'none', nextIndex: this.currentIndex };
  }

  clear(): void {
    this.queue = [];
    this.currentIndex = -1;
  }

  findIndexByVideoId(videoId: string): number {
    return this.queue.findIndex((t) => t.videoId === videoId);
  }

  insertAfterCurrent(track: Track): number {
    const insertIdx = this.currentIndex + 1;
    this.queue.splice(insertIdx, 0, track);
    return insertIdx;
  }

  hasNext(): boolean {
    if (this.isShuffle) return this.queue.length > 1;
    return this.currentIndex < this.queue.length - 1;
  }

  hasPrevious(): boolean {
    return this.currentIndex > 0;
  }

  getNextIndex(): number | null {
    if (this.queue.length === 0) return null;
    if (this.isShuffle && this.queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * this.queue.length);
      while (nextIdx === this.currentIndex && this.queue.length > 1) {
        nextIdx = Math.floor(Math.random() * this.queue.length);
      }
      return nextIdx;
    }
    if (this.currentIndex < this.queue.length - 1) {
      return this.currentIndex + 1;
    }
    if (this.repeatMode === 'all') {
      return 0;
    }
    return null;
  }

  getPreviousIndex(): number | null {
    if (this.queue.length === 0) return null;
    if (this.currentIndex > 0) {
      return this.currentIndex - 1;
    }
    if (this.repeatMode === 'all' && this.queue.length > 0) {
      return this.queue.length - 1;
    }
    return null;
  }

  getNextUpcomingTrack(): Track | null {
    const nextIndex = this.currentIndex + 1;
    return (
      this.queue[nextIndex] ||
      (this.repeatMode === 'all' && this.queue.length > 1 ? this.queue[0] : null)
    );
  }

  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  setShuffle(shuffle: boolean): void {
    this.isShuffle = shuffle;
  }

  getShuffle(): boolean {
    return this.isShuffle;
  }

  getLength(): number {
    return this.queue.length;
  }
}
