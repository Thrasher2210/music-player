import { NextResponse } from 'next/server';
import { parseRangeHeader, resolveRange, sliceStream } from './range';

export const STREAM_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function baseHeaders(upstream: Response): Headers {
  const headers = new Headers(STREAM_CORS_HEADERS);
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  return headers;
}

/**
 * Turns an ok upstream response into the proxied response, streaming the body
 * through. Content-Length is not set on purpose: Next strips it from route
 * handler responses and frames them itself (chunked), whether the body is
 * buffered or streamed.
 *
 * When upstream ignored the Range header and sent the full body, the requested
 * slice is cut out here so a 206 always carries a matching Content-Range.
 */
export function buildStreamResponse(
  upstream: Response,
  rangeHeader: string | null,
  method: 'GET' | 'HEAD'
): NextResponse {
  const headers = baseHeaders(upstream);
  const upstreamLength = upstream.headers.get('content-length');
  const total = upstreamLength === null ? NaN : Number(upstreamLength);

  const requested = rangeHeader && upstream.status === 200 ? parseRangeHeader(rangeHeader) : null;
  if (requested && Number.isFinite(total)) {
    const resolved = resolveRange(requested, total);
    if (!resolved) {
      void upstream.body?.cancel();
      headers.set('Content-Range', `bytes */${total}`);
      return new NextResponse(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${resolved.start}-${resolved.end}/${total}`);
    if (method === 'HEAD' || !upstream.body) {
      void upstream.body?.cancel();
      return new NextResponse(null, { status: 206, headers });
    }
    const slice = sliceStream(upstream.body, resolved.start, resolved.end - resolved.start + 1);
    return new NextResponse(slice, { status: 206, headers });
  }

  const upstreamRange = upstream.headers.get('content-range');
  if (upstreamRange) headers.set('Content-Range', upstreamRange);
  if (method === 'HEAD') {
    void upstream.body?.cancel();
    return new NextResponse(null, { status: upstream.status, headers });
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
