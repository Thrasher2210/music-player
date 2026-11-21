import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRangeHeader, resolveRange, sliceStream } from '../src/lib/yt-proxy/range';
import { bytes } from './fetchStub';

function streamOf(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<number[]> {
  const out: number[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out.push(...value);
  }
}

function split(data: Uint8Array, sizes: number[]): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  for (const size of sizes) {
    chunks.push(data.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
}

describe('parseRangeHeader', () => {
  it('parses bounded, open ended and suffix ranges', () => {
    assert.deepEqual(parseRangeHeader('bytes=0-1023'), { start: 0, end: 1023 });
    assert.deepEqual(parseRangeHeader('bytes=500-'), { start: 500, end: null });
    assert.deepEqual(parseRangeHeader('bytes=-200'), { suffix: 200 });
  });

  it('rejects malformed, inverted and multi ranges', () => {
    for (const value of [null, '', 'bytes=-', 'bytes=5-2', 'bytes=0-1,5-6', 'items=0-1', 'bytes=a-b']) {
      assert.equal(parseRangeHeader(value), null, String(value));
    }
  });
});

describe('resolveRange', () => {
  it('clamps the end to the file size', () => {
    assert.deepEqual(resolveRange({ start: 2, end: 99 }, 10), { start: 2, end: 9 });
    assert.deepEqual(resolveRange({ start: 7, end: null }, 10), { start: 7, end: 9 });
    assert.deepEqual(resolveRange({ start: 0, end: 0 }, 10), { start: 0, end: 0 });
  });

  it('resolves suffix ranges', () => {
    assert.deepEqual(resolveRange({ suffix: 3 }, 10), { start: 7, end: 9 });
    assert.deepEqual(resolveRange({ suffix: 50 }, 10), { start: 0, end: 9 });
  });

  it('returns null when unsatisfiable', () => {
    assert.equal(resolveRange({ start: 10, end: null }, 10), null);
    assert.equal(resolveRange({ start: 0, end: 5 }, 0), null);
    assert.equal(resolveRange({ suffix: 0 }, 10), null);
  });
});

describe('sliceStream', () => {
  const data = bytes(10);

  it('returns the requested window across chunk boundaries', async () => {
    const chunks = split(data, [3, 3, 4]);
    assert.deepEqual(await collect(sliceStream(streamOf(chunks), 2, 5)), [2, 3, 4, 5, 6]);
  });

  it('handles a window inside one chunk and a window to the end', async () => {
    assert.deepEqual(await collect(sliceStream(streamOf([data]), 4, 2)), [4, 5]);
    assert.deepEqual(await collect(sliceStream(streamOf(split(data, [4, 6])), 7, 3)), [7, 8, 9]);
  });

  it('skips whole leading chunks', async () => {
    assert.deepEqual(await collect(sliceStream(streamOf(split(data, [2, 2, 2, 2, 2])), 5, 2)), [5, 6]);
  });

  it('stops reading upstream once the window is complete', async () => {
    let cancelled = false;
    const stream = sliceStream(streamOf(split(data, [5, 5]), () => (cancelled = true)), 0, 3);
    assert.deepEqual(await collect(stream), [0, 1, 2]);
    assert.equal(cancelled, true);
  });
});
