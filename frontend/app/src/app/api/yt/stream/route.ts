import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const targetUrl = req.nextUrl.searchParams.get('url');
    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Security check: only allow googlevideo.com and youtube.com streams
    try {
      const parsed = new URL(targetUrl);
      if (
        !parsed.hostname.endsWith('.googlevideo.com') &&
        !parsed.hostname.endsWith('.youtube.com')
      ) {
        return new NextResponse('Forbidden target host', { status: 403 });
      }
    } catch {
      return new NextResponse('Invalid target URL', { status: 400 });
    }

    const headers: Record<string, string> = {
      'User-Agent':
        req.headers.get('user-agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Referer: 'https://www.youtube.com/',
      Origin: 'https://www.youtube.com',
    };

    // Forward byte-range header for MSE streaming
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

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
