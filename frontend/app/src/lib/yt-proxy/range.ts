export type ByteRange = { start: number; end: number | null } | { suffix: number };

export interface ResolvedRange {
  start: number;
  end: number;
}

/** Parses a single `bytes=` range. Multi-range and malformed headers return null. */
export function parseRangeHeader(header: string | null): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '');
  if (!match) return null;
  const [, first, last] = match;
  if (first === '') {
    return last === '' ? null : { suffix: Number(last) };
  }
  const start = Number(first);
  const end = last === '' ? null : Number(last);
  if (end !== null && end < start) return null;
  return { start, end };
}

/** Resolves a range against a known size; null means unsatisfiable. */
export function resolveRange(range: ByteRange, total: number): ResolvedRange | null {
  if ('suffix' in range) {
    if (range.suffix === 0 || total === 0) return null;
    return { start: Math.max(0, total - range.suffix), end: total - 1 };
  }
  if (range.start >= total) return null;
  return { start: range.start, end: Math.min(range.end ?? total - 1, total - 1) };
}

/**
 * Streams only bytes [start, start + length) of a full-body stream and stops
 * reading upstream as soon as the slice is complete.
 */
export function sliceStream(
  body: ReadableStream<Uint8Array>,
  start: number,
  length: number
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let skipped = 0;
  let sent = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        let chunk = value;
        if (skipped < start) {
          const drop = Math.min(start - skipped, chunk.length);
          skipped += drop;
          chunk = chunk.subarray(drop);
          if (chunk.length === 0) continue;
        }
        const remaining = length - sent;
        if (chunk.length >= remaining) {
          controller.enqueue(chunk.subarray(0, remaining));
          controller.close();
          await reader.cancel();
          return;
        }
        sent += chunk.length;
        controller.enqueue(chunk);
        return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
