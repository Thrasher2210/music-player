import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Maximum byte range per upstream request (128KB) to strictly prevent YouTube CDN 403 chunk throttling
const MAX_CHUNK_SIZE = 128 * 1024; // 131,072 bytes

function getBaseHeaders(clientParam: string, range?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Accept-Encoding': 'identity',
    Connection: 'keep-alive',
  };

  if (clientParam === 'IOS') {
    headers['User-Agent'] =
      'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; US)';
    // Omit Origin and Referer for iOS app streams to avoid YouTube CDN 403 chunk drops
  } else if (clientParam === 'VISIONOS') {
    headers['User-Agent'] =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    headers['Referer'] = 'https://www.youtube.com/';
    headers['Origin'] = 'https://www.youtube.com';
  } else if (clientParam === 'WEB_REMIX') {
    headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    headers['Referer'] = 'https://music.youtube.com/';
    headers['Origin'] = 'https://music.youtube.com';
  } else {
    headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    headers['Referer'] = 'https://www.youtube.com/';
    headers['Origin'] = 'https://www.youtube.com';
  }

  if (range) {
    headers['Range'] = range;
  }
  return headers;
}

function getFallbackHeaders(range?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Accept-Encoding': 'identity',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    Referer: 'https://www.youtube.com/',
    Origin: 'https://www.youtube.com',
  };
  if (range) {
    headers['Range'] = range;
  }
  return headers;
}

async function fetchWithFallback(
  targetUrl: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<Response> {
  let res = await fetch(targetUrl, {
    method: 'GET',
    headers,
    signal,
  });

  // Fallback retry if YouTube CDN rejected with 403
  if (res.status === 403) {
    const fallbackHeaders = getFallbackHeaders(headers['Range']);
    try {
      const retryRes = await fetch(targetUrl, {
        method: 'GET',
        headers: fallbackHeaders,
        signal,
      });
      if (retryRes.ok || retryRes.status === 206) {
        res = retryRes;
      } else {
        // Clean retry without Referer/Origin
        const minimalHeaders: Record<string, string> = {
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          'User-Agent': fallbackHeaders['User-Agent'],
        };
        if (headers['Range']) {
          minimalHeaders['Range'] = headers['Range'];
        }
        const cleanRetry = await fetch(targetUrl, {
          method: 'GET',
          headers: minimalHeaders,
          signal,
        });
        if (cleanRetry.ok || cleanRetry.status === 206) {
          res = cleanRetry;
        }
      }
    } catch {
      // Continue with original response
    }
  }

  return res;
}

export async function GET(req: NextRequest) {
  try {
    const targetUrl = req.nextUrl.searchParams.get('url');
    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Security check: only allow googlevideo.com and youtube.com streams
    const parsed = new URL(targetUrl);
    if (
      !parsed.hostname.endsWith('.googlevideo.com') &&
      !parsed.hostname.endsWith('.youtube.com')
    ) {
      return new NextResponse('Forbidden target host', { status: 403 });
    }

    const clientParam = parsed.searchParams.get('c') || '';
    const rangeHeader = req.headers.get('range');

    let reqStart = 0;
    let reqEnd: number | undefined;
    let hasRange = false;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
      if (match) {
        hasRange = true;
        reqStart = parseInt(match[1], 10);
        if (match[2] !== undefined && match[2] !== '') {
          reqEnd = parseInt(match[2], 10);
        }
      }
    }

    // Case 1: Client requested a bounded range that is already <= 128KB
    if (hasRange && reqEnd !== undefined && reqEnd - reqStart + 1 <= MAX_CHUNK_SIZE) {
      const headers = getBaseHeaders(clientParam, `bytes=${reqStart}-${reqEnd}`);
      const upstreamRes = await fetchWithFallback(targetUrl, headers, req.signal);

      const buf = await upstreamRes.arrayBuffer();

      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Accept-Ranges', 'bytes');
      responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');

      const contentType = upstreamRes.headers.get('content-type') || 'audio/mp4';
      responseHeaders.set('Content-Type', contentType);
      responseHeaders.set('Content-Length', buf.byteLength.toString());

      const contentRange = upstreamRes.headers.get('content-range') || `bytes ${reqStart}-${reqEnd}/*`;
      responseHeaders.set('Content-Range', contentRange);

      return new NextResponse(buf, {
        status: upstreamRes.status === 200 ? 206 : upstreamRes.status,
        headers: responseHeaders,
      });
    }

    // Case 2: Range > 128KB, open-ended range (e.g. bytes=0-), or full stream without Range
    // Fetch the first sub-chunk of at most MAX_CHUNK_SIZE (128KB)
    const firstEnd =
      reqEnd !== undefined
        ? Math.min(reqEnd, reqStart + MAX_CHUNK_SIZE - 1)
        : reqStart + MAX_CHUNK_SIZE - 1;

    const firstHeaders = getBaseHeaders(clientParam, `bytes=${reqStart}-${firstEnd}`);
    const firstRes = await fetchWithFallback(targetUrl, firstHeaders, req.signal);

    if (!firstRes.ok && firstRes.status !== 206) {
      return new NextResponse(`Upstream streaming error: HTTP ${firstRes.status}`, {
        status: firstRes.status,
      });
    }

    const contentRangeHeader = firstRes.headers.get('content-range');
    let totalLength: number | undefined;
    if (contentRangeHeader) {
      const crMatch = contentRangeHeader.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/);
      if (crMatch && crMatch[3] !== '*') {
        totalLength = parseInt(crMatch[3], 10);
      }
    }

    const finalEnd =
      reqEnd !== undefined
        ? reqEnd
        : totalLength !== undefined && totalLength > 0
          ? totalLength - 1
          : firstEnd;

    // If the stream or requested range completed in this single first chunk
    if (finalEnd <= firstEnd) {
      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Accept-Ranges', 'bytes');
      responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');

      const contentType = firstRes.headers.get('content-type');
      if (contentType) responseHeaders.set('Content-Type', contentType);

      const contentLength = firstRes.headers.get('content-length');
      if (contentLength) responseHeaders.set('Content-Length', contentLength);

      if (contentRangeHeader) responseHeaders.set('Content-Range', contentRangeHeader);

      return new NextResponse(firstRes.body, {
        status: hasRange ? 206 : firstRes.status,
        headers: responseHeaders,
      });
    }

    // Multiple sub-chunks needed: Stream sub-chunks in <= 128KB slices
    const totalContentLength = finalEnd - reqStart + 1;
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');

    const contentType = firstRes.headers.get('content-type') || 'audio/webm';
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Content-Length', totalContentLength.toString());

    if (hasRange) {
      responseHeaders.set(
        'Content-Range',
        `bytes ${reqStart}-${finalEnd}/${totalLength !== undefined ? totalLength : '*'}`
      );
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // 1. Enqueue the already-fetched first sub-chunk
          const firstBuf = await firstRes.arrayBuffer();
          controller.enqueue(new Uint8Array(firstBuf));

          // 2. Stream subsequent sub-chunks strictly <= 128KB each
          let currentStart = firstEnd + 1;
          while (currentStart <= finalEnd) {
            if (req.signal.aborted) {
              break;
            }

            const currentEnd = Math.min(finalEnd, currentStart + MAX_CHUNK_SIZE - 1);
            const chunkHeaders = getBaseHeaders(
              clientParam,
              `bytes=${currentStart}-${currentEnd}`
            );

            const chunkRes = await fetchWithFallback(targetUrl, chunkHeaders, req.signal);
            if (!chunkRes.ok && chunkRes.status !== 206) {
              controller.error(new Error(`Upstream sub-chunk error HTTP ${chunkRes.status}`));
              return;
            }

            const chunkBuf = await chunkRes.arrayBuffer();
            if (chunkBuf.byteLength === 0) {
              break;
            }

            controller.enqueue(new Uint8Array(chunkBuf));
            currentStart = currentEnd + 1;
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        // Stream aborted by client
      },
    });

    return new NextResponse(stream, {
      status: hasRange ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(`Streaming error: ${error?.message || error}`, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
