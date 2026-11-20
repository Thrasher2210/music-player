import { NextRequest } from 'next/server';

export const HOST = 'https://rr1---sn-test.googlevideo.com/videoplayback';
export const BASE = 'http://localhost:3000/api/yt/stream';

export function streamRequest(
  target: string,
  opts: { range?: string; v?: string; method?: string } = {}
): NextRequest {
  const url = new URL(BASE);
  url.searchParams.set('url', target);
  if (opts.v) url.searchParams.set('v', opts.v);
  const headers: Record<string, string> = {};
  if (opts.range) headers.range = opts.range;
  return new NextRequest(url, { method: opts.method ?? 'GET', headers });
}

export async function body(res: Response): Promise<number[]> {
  return [...new Uint8Array(await res.arrayBuffer())];
}

export async function within<T>(ms: number, promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out, body was buffered')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
