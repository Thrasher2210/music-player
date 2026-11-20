import {
  AudioDriver,
  AudioDriverEvents,
  AudioPlaybackState,
  SabrStreamConfig,
} from './types';

export class HtmlAudioDriver implements AudioDriver {
  readonly name = 'html-audio';

  private mediaElement: HTMLMediaElement | null = null;
  private isHeadlessMedia = false;
  private state: AudioPlaybackState = 'idle';
  private listeners: { [E in keyof AudioDriverEvents]?: Set<AudioDriverEvents[E]> } = {};
  private boundElementListeners: Array<{ type: string; listener: EventListener }> = [];
  private volume = 1;
  private playbackRate = 1;

  async initialize(mediaElement?: HTMLMediaElement): Promise<void> {
    if (this.mediaElement) return;

    if (mediaElement) {
      this.mediaElement = mediaElement;
      this.isHeadlessMedia = false;
    } else if (typeof document !== 'undefined') {
      this.mediaElement = document.createElement('audio');
      this.mediaElement.preload = 'auto';
      this.isHeadlessMedia = true;
    } else {
      this.state = 'idle';
      return;
    }

    this.mediaElement.volume = this.volume;
    this.mediaElement.playbackRate = this.playbackRate;
    this.attachEventListeners();
    this.setState('idle');
  }

  private attachEventListeners(): void {
    if (!this.mediaElement) return;

    const addElListener = (type: string, listener: EventListener) => {
      this.mediaElement!.addEventListener(type, listener);
      this.boundElementListeners.push({ type, listener });
    };

    addElListener('timeupdate', () => {
      if (this.mediaElement) {
        this.emit('timeUpdate', this.mediaElement.currentTime);
      }
    });

    addElListener('durationchange', () => {
      if (this.mediaElement) {
        this.emit('durationChange', this.mediaElement.duration || 0);
      }
    });

    addElListener('ratechange', () => {
      if (this.mediaElement) {
        this.playbackRate = this.mediaElement.playbackRate;
        this.emit('rateChange', this.playbackRate);
      }
    });

    addElListener('play', () => this.setState('playing'));
    addElListener('pause', () => {
      if (this.state !== 'ended' && this.state !== 'error') {
        this.setState('paused');
      }
    });
    addElListener('waiting', () => this.setState('buffering'));
    addElListener('playing', () => this.setState('playing'));
    addElListener('ended', () => {
      this.setState('ended');
      this.emit('ended');
    });

    addElListener('error', () => {
      const mediaErr = this.mediaElement?.error;
      const error = new Error(`[HtmlAudioDriver Error] Code ${mediaErr?.code}: ${mediaErr?.message}`);
      this.setState('error');
      this.emit('error', error);
    });
  }

  private detachEventListeners(): void {
    if (this.mediaElement) {
      for (const { type, listener } of this.boundElementListeners) {
        this.mediaElement.removeEventListener(type, listener);
      }
    }
    this.boundElementListeners = [];
  }

  private setState(newState: AudioPlaybackState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChange', newState);
    }
  }

  async load(src: string, startTime: number = 0, _sabrConfig?: SabrStreamConfig): Promise<void> {
    if (!this.mediaElement) {
      await this.initialize();
    }
    if (!this.mediaElement) {
      throw new Error('[HtmlAudioDriver] Media element not initialized');
    }

    this.setState('loading');
    this.mediaElement.src = src;
    if (startTime > 0) {
      this.mediaElement.currentTime = startTime;
    }
    this.mediaElement.load();
    this.setState('paused');
  }

  async play(): Promise<void> {
    if (!this.mediaElement) return;
    try {
      await this.mediaElement.play();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        this.setState('error');
        this.emit('error', err);
        throw err;
      }
    }
  }

  async pause(): Promise<void> {
    if (!this.mediaElement) return;
    this.setState('paused');
    this.mediaElement.pause();
  }

  async seek(time: number): Promise<void> {
    if (!this.mediaElement) return;
    const duration = this.getDuration();
    const clampedTime = Math.max(0, duration > 0 ? Math.min(time, duration) : time);
    this.mediaElement.currentTime = clampedTime;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.mediaElement) {
      this.mediaElement.volume = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.mediaElement) {
      this.mediaElement.playbackRate = rate;
    }
  }

  getPlaybackRate(): number {
    return this.mediaElement ? this.mediaElement.playbackRate : this.playbackRate;
  }

  getCurrentTime(): number {
    return this.mediaElement ? this.mediaElement.currentTime : 0;
  }

  getDuration(): number {
    return this.mediaElement && !isNaN(this.mediaElement.duration)
      ? this.mediaElement.duration
      : 0;
  }

  isPaused(): boolean {
    return this.mediaElement ? this.mediaElement.paused : true;
  }

  getState(): AudioPlaybackState {
    return this.state;
  }

  hasLoadedStream(): boolean {
    return Boolean(
      this.mediaElement &&
      this.mediaElement.src &&
      this.state !== 'idle' &&
      this.state !== 'error'
    );
  }

  on<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    this.listeners[event]!.add(listener);
    return () => this.off(event, listener);
  }

  off<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): void {
    this.listeners[event]?.delete(listener);
  }

  private emit<E extends keyof AudioDriverEvents>(
    event: E,
    ...args: Parameters<AudioDriverEvents[E]>
  ): void {
    const handlers = this.listeners[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          (handler as any)(...args);
        } catch (e) {
          console.error(`[HtmlAudioDriver] Error in event listener for ${event}:`, e);
        }
      }
    }
  }

  async destroy(): Promise<void> {
    this.detachEventListeners();
    if (this.mediaElement) {
      this.mediaElement.src = '';
      this.mediaElement.load();
      if (this.isHeadlessMedia) {
        this.mediaElement = null;
      }
    }
    this.listeners = {};
    this.setState('idle');
  }
}
