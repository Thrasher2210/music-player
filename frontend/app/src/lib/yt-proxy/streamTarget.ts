const STREAM_HOST_SUFFIX = '.googlevideo.com';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export type StreamTarget =
  | { ok: true; url: URL }
  | { ok: false; status: 400 | 403; message: string };

export function isAllowedStreamUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    url.hostname.endsWith(STREAM_HOST_SUFFIX)
  );
}

export function parseStreamTarget(raw: string | null): StreamTarget {
  if (!raw) {
    return { ok: false, status: 400, message: 'Missing url parameter' };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, status: 400, message: 'Invalid url parameter' };
  }
  if (!isAllowedStreamUrl(url)) {
    return { ok: false, status: 403, message: 'Forbidden target host' };
  }
  return { ok: true, url };
}

export function isValidVideoId(value: string | null | undefined): value is string {
  return typeof value === 'string' && VIDEO_ID_PATTERN.test(value);
}
