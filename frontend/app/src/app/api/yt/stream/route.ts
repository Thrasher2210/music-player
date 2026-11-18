import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    const headers: Record<string, string> = {
      Accept: '*/*',
      'Accept-Encoding': 'identity',
    };

    if (clientParam === 'IOS') {
      headers['User-Agent'] = 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; US)';
      // Omit Origin and Referer for iOS app streams to avoid YouTube CDN 403 chunk drops
    } else if (clientParam === 'VISIONOS') {
      headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    } else if (clientParam === 'WEB_REMIX') {
      headers['User-Agent'] =
        req.headers.get('user-agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
      headers['Referer'] = 'https://music.youtube.com/';
      headers['Origin'] = 'https://music.youtube.com';
    } else {
      headers['User-Agent'] =
        req.headers.get('user-agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
      headers['Referer'] = 'https://www.youtube.com/';
      headers['Origin'] = 'https://www.youtube.com';
    }

    // Forward byte-range header for MSE streaming
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    let upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    // Fallback: If YouTube CDN dropped chunk with 403, retry once with desktop browser headers
    if (upstreamRes.status === 403) {
      const fallbackHeaders: Record<string, string> = {
        Accept: '*/*',
        'Accept-Encoding': 'identity',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      };
      if (rangeHeader) {
        fallbackHeaders['Range'] = rangeHeader;
      }
      try {
        const retryRes = await fetch(targetUrl, {
          method: 'GET',
          headers: fallbackHeaders,
        });
        if (retryRes.ok || retryRes.status === 206) {
          upstreamRes = retryRes;
        }
      } catch {
        // Continue with original upstreamRes
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
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
