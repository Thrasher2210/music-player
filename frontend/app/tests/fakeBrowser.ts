import type { Track } from '@mp/player-core';

export interface FetchCall {
  url: string;
  method: string;
  body: any;
}

export type FetchHandler = (call: FetchCall) => { status: number; json?: unknown } | Promise<{ status: number; json?: unknown }>;

const g = globalThis as any;
const realFetch = g.fetch;

/** In-memory window + localStorage for modules that guard on `typeof window`. */
export function installFakeStorage(): Map<string, string> {
  const store = new Map<string, string>();
  g.window = globalThis;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
  return store;
}

/** Replaces global fetch. Returns the recorded calls. */
export function stubFetch(handler: FetchHandler): FetchCall[] {
  const calls: FetchCall[] = [];
  g.fetch = async (input: string, init?: RequestInit) => {
    const call: FetchCall = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const { status, json } = await handler(call);
    return new Response(json === undefined ? null : JSON.stringify(json), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return calls;
}

export function restoreFetch(): void {
  g.fetch = realFetch;
}

export function track(videoId: string, extra: Partial<Track> = {}): Track {
  return {
    id: videoId,
    videoId,
    title: `Title ${videoId}`,
    artist: `Artist ${videoId}`,
    duration: 100,
    thumbnail: '',
    ...extra,
  };
}
