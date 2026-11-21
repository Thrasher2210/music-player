const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export function getBaseHeaders(clientParam: string, range?: string): Record<string, string> {
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
    headers['User-Agent'] = DESKTOP_UA;
    headers['Referer'] = 'https://music.youtube.com/';
    headers['Origin'] = 'https://music.youtube.com';
  } else {
    headers['User-Agent'] = DESKTOP_UA;
    headers['Referer'] = 'https://www.youtube.com/';
    headers['Origin'] = 'https://www.youtube.com';
  }

  if (range) {
    headers['Range'] = range;
  }
  return headers;
}

export function getFallbackHeaders(range?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Accept-Encoding': 'identity',
    'User-Agent': DESKTOP_UA,
    Referer: 'https://www.youtube.com/',
    Origin: 'https://www.youtube.com',
  };
  if (range) {
    headers['Range'] = range;
  }
  return headers;
}

export function getMinimalHeaders(range?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Accept-Encoding': 'identity',
    'User-Agent': DESKTOP_UA,
  };
  if (range) {
    headers['Range'] = range;
  }
  return headers;
}
