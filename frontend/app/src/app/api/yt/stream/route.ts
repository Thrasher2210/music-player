import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
  } else if (clientParam === 'ANDROID_MUSIC' || clientParam === 'ANDROID') {
    headers['User-Agent'] =
      'com.google.android.apps.youtube.music/6.40.52 (Linux; U; Android 14; US) gzip';
    // Omit Origin and Referer for mobile app clients
  } else if (clientParam === 'VISIONOS') {
    headers['User-Agent'] =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    // Omit Origin and Referer for VISIONOS direct URLs
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

// In-memory cache for sliding window URLs: videoId -> Map<windowSlot, { url: string, expiresAt: number }>
// Each slot represents a 45-second window
const rollingUrlCache = new Map<string, Map<number, { url: string; expiresAt: number }>>();

async function getFreshRollingUrl(
  videoId: string,
  itag: number,
  startByte: number
): Promise<string | null> {
  const bytesPerSec = itag === 140 ? 16000 : 6000;
  const estimatedSec = Math.max(0, Math.floor(startByte / bytesPerSec));
  const slot = Math.floor(estimatedSec / 45);

  const videoCache = rollingUrlCache.get(videoId);
  const now = Date.now();
  if (videoCache) {
    const cached = videoCache.get(slot);
    if (cached && cached.expiresAt > now) {
      return cached.url;
    }
  }

  try {
    const endpoint = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; US)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'iOS',
            clientVersion: '20.11.6',
            hl: 'en',
            gl: 'US',
            deviceMake: 'Apple',
            osName: 'iOS',
            platform: 'MOBILE',
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
        startTimeSecs: estimatedSec,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const formats = [
      ...(data.streamingData?.formats || []),
      ...(data.streamingData?.adaptiveFormats || []),
    ];
    const matching =
      formats.find((f: any) => f.itag === itag && Boolean(f.url)) ||
      formats.find((f: any) => Boolean(f.url));

    if (matching?.url) {
      if (!rollingUrlCache.has(videoId)) {
        rollingUrlCache.set(videoId, new Map());
      }
      rollingUrlCache.get(videoId)!.set(slot, {
        url: matching.url,
        expiresAt: now + 5 * 60 * 1000,
      });
      return matching.url;
    }
  } catch {
    // Fail silently to normal flow
  }
  return null;
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

    const videoId =
      req.nextUrl.searchParams.get('v') ||
      req.nextUrl.searchParams.get('videoId') ||
      '';

    const clientParam = parsed.searchParams.get('c') || '';
    const itagParam = parseInt(parsed.searchParams.get('itag') || '140', 10);
    const rangeHeader = req.headers.get('range');
    const headers = getBaseHeaders(clientParam, rangeHeader || undefined);

    // Initial upstream fetch with signal propagation
    let upstreamRes = await fetchWithFallback(targetUrl, headers, req.signal);

    // If 403 on a range request, perform seamless sliding-window refresh
    if (upstreamRes.status === 403 && rangeHeader && videoId) {
      const match = rangeHeader.match(/bytes=(\d+)-/);
      const reqStart = match ? parseInt(match[1], 10) : 0;
      const freshUrl = await getFreshRollingUrl(videoId, itagParam, reqStart);
      if (freshUrl) {
        const freshHeaders = getBaseHeaders(clientParam, rangeHeader);
        const retryRes = await fetch(freshUrl, {
          method: 'GET',
          headers: freshHeaders,
          signal: req.signal,
        });
        if (retryRes.ok || retryRes.status === 206) {
          upstreamRes = retryRes;
        }
      }
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(`Upstream streaming error: HTTP ${upstreamRes.status}`, {
        status: upstreamRes.status,
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    responseHeaders.set('Accept-Ranges', upstreamRes.headers.get('accept-ranges') || 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const status = rangeHeader && upstreamRes.status === 200 ? 206 : upstreamRes.status;

    // For Range requests (or 206 partial content): MUST send ArrayBuffer so Next.js sets Content-Length
    // and omits Transfer-Encoding: chunked (which breaks MSE and HTML5 audio initialization)
    if (rangeHeader || upstreamRes.status === 206) {
      const buf = await upstreamRes.arrayBuffer();
      responseHeaders.set('Content-Length', buf.byteLength.toString());
      return new NextResponse(buf, {
        status,
        headers: responseHeaders,
      });
    }

    // For full open-ended stream requests: stream directly
    return new NextResponse(upstreamRes.body, {
      status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(`Streaming error: ${error?.message || error}`, { status: 500 });
  }
}

export async function HEAD(req: NextRequest) {
  return GET(req);
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
