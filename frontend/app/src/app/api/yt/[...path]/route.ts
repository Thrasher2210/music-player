import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const subpath = path ? path.join('/') : '';
    const search = req.nextUrl.search;
    
    // Ensure InnerTube public key is always present
    const defaultKey = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
    const queryParams = new URLSearchParams(search);
    if (!queryParams.has('key')) {
      queryParams.set('key', defaultKey);
    }
    queryParams.set('prettyPrint', 'false');

    // YouTube InnerTube API endpoint
    const targetUrl = `https://www.youtube.com/youtubei/v1/${subpath}?${queryParams.toString()}`;

    const bodyText = await req.text();

    const forwardHeaders: Record<string, string> = {
      'Content-Type': req.headers.get('content-type') || 'text/plain',
      'User-Agent':
        req.headers.get('user-agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Origin: 'https://www.youtube.com',
      Referer: 'https://www.youtube.com/',
    };

    const clientName = req.headers.get('x-youtube-client-name');
    if (clientName) forwardHeaders['X-YouTube-Client-Name'] = clientName;

    const clientVersion = req.headers.get('x-youtube-client-version');
    if (clientVersion) forwardHeaders['X-YouTube-Client-Version'] = clientVersion;

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: bodyText,
    });

    const data = await res.text();

    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Proxy Error',
        message: error?.message || 'Failed to proxy request to YouTube InnerTube',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'YouTube InnerTube Proxy',
    proxyTarget: 'https://www.youtube.com/youtubei/v1/*',
  });
}
