export interface MockDriverOptions {
  currentTime?: number;
  duration?: number;
  isPaused?: boolean;
  state?: string;
}

export function createMockAudioDriver(options: MockDriverOptions = {}) {
  let driverState = options.state || 'idle';
  let loadedSrc = '';
  let loadedStartTime = -1;
  let driverRate = 1.0;
  let curTime = options.currentTime ?? 0;
  let dur = options.duration ?? 0;
  const listeners: Record<string, Function[]> = {};

  return {
    name: 'mock-driver',
    initialize: async () => {},
    destroy: async () => {},
    load: async (src: string, startTime = 0) => {
      loadedSrc = src;
      loadedStartTime = startTime;
      driverState = 'paused';
    },
    play: async () => {
      driverState = 'playing';
    },
    pause: async () => {
      driverState = 'paused';
    },
    seek: async (t: number) => {
      curTime = t;
    },
    setVolume: () => {},
    getVolume: () => 1,
    setPlaybackRate: (r: number) => {
      driverRate = r;
    },
    getPlaybackRate: () => driverRate,
    getCurrentTime: () => curTime,
    getDuration: () => dur,
    isPaused: () => (options.isPaused !== undefined ? options.isPaused : driverState === 'paused'),
    getState: () => driverState,
    hasLoadedStream: () => Boolean(loadedSrc),
    getLoadedSrc: () => loadedSrc,
    getLoadedStartTime: () => loadedStartTime,
    on: (event: string, fn: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return () => {};
    },
    off: () => {},
    emit: (event: string, ...args: any[]) => {
      if (event === 'timeUpdate' && typeof args[0] === 'number') {
        curTime = args[0];
      }
      if (event === 'durationChange' && typeof args[0] === 'number') {
        dur = args[0];
      }
      listeners[event]?.forEach((fn) => fn(...args));
    },
  };
}
