import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const rawSubpath = path ? path.join('/') : '';
    const subpath = rawSubpath.replace(/^youtubei\/v1\/?/, '');
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

    let clientName = '';
    let clientVersion = '';
    try {
      const parsedBody = JSON.parse(bodyText);
      clientName = parsedBody?.context?.client?.clientName || '';
      clientVersion = parsedBody?.context?.client?.clientVersion || '';
    } catch {
      // not JSON
    }

    const isTv = clientName.toUpperCase().startsWith('TVHTML5');
    const isAndroid = clientName.toUpperCase().startsWith('ANDROID');
    const isIos = clientName.toLowerCase() === 'ios';
    const isVision = clientName.toLowerCase() === 'visionos';
    const isMweb = clientName.toUpperCase() === 'MWEB';
    const isWeb = clientName.toUpperCase() === 'WEB';

    let headerClientName = '67';
    let headerClientVersion = '1.20250210.01.00';
    let userAgent =
      req.headers.get('user-agent') ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    if (isTv) {
      headerClientName = '31';
      headerClientVersion = clientVersion || '7.20260707.07.00';
      userAgent =
        'Mozilla/5.0(SMART-TV; Linux; Tizen 4.0.0.2) AppleWebkit/605.1.15 (KHTML, like Gecko) SamsungBrowser/9.2 TV Safari/605.1.15';
    } else if (isAndroid) {
      headerClientName = clientName.toUpperCase() === 'ANDROID_MUSIC' ? '67' : '3';
      headerClientVersion = clientVersion || '21.26.364';
      userAgent =
        'com.google.android.youtube/21.26.364 (Linux; U; Android 15; en_US; Pixel 9 Pro; Build/AP4A.250205.002; Cronet/132.0.6834.79) gzip';
    } else if (isIos) {
      headerClientName = '5';
      headerClientVersion = clientVersion || '20.11.6';
      userAgent = 'com.google.ios.youtube/20.11.6 (iPhone16,2; U; CPU OS 17_4 like Mac OS X; en_US)';
    } else if (isVision) {
      headerClientName = '111';
      headerClientVersion = clientVersion || '1.02';
    } else if (isMweb) {
      headerClientName = '62';
      headerClientVersion = clientVersion || '2.20250210.01.00';
    } else if (isWeb) {
      headerClientName = '1';
      headerClientVersion = clientVersion || '2.20250210.01.00';
    }

    const isMobileClient = isIos || isVision || isAndroid || isTv;

    const forwardHeaders: Record<string, string> = {
      'Content-Type': req.headers.get('content-type') || 'text/plain',
      'User-Agent': userAgent,
      'X-YouTube-Client-Name': req.headers.get('x-youtube-client-name') || headerClientName,
      'X-YouTube-Client-Version': req.headers.get('x-youtube-client-version') || headerClientVersion,
    };

    if (!isMobileClient) {
      forwardHeaders['Origin'] = 'https://music.youtube.com';
      forwardHeaders['Referer'] = 'https://music.youtube.com/';
    }

    const visitorData = req.headers.get('x-goog-visitor-id');
    if (visitorData) {
      forwardHeaders['X-Goog-Visitor-Id'] = visitorData;
    }

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
