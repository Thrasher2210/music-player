export interface RecordedCall {
  url: string;
  init: RequestInit;
}

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

/** Replaces globalThis.fetch with a recorder. Call the returned function to restore it. */
export function stubFetch(handler: Handler): { calls: RecordedCall[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: RecordedCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

export function bytes(length: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.from({ length }, (_, i) => i % 256);
}

export function headerOf(init: RequestInit, name: string): string | undefined {
  const headers = init.headers as Record<string, string> | undefined;
  return headers?.[name];
}
