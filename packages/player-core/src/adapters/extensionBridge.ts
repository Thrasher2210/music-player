import { YouTubeAuthStatus } from '../types';

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function isExtensionActive(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__MP_EXTENSION_ACTIVE__);
}

export function checkExtension(timeoutMs = 400): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).__MP_EXTENSION_ACTIVE__) return Promise.resolve(true);

  const requestId = generateRequestId();
  return new Promise<boolean>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener('message', handleMessage);
        resolve(Boolean((window as any).__MP_EXTENSION_ACTIVE__));
      }
    }, timeoutMs);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      const data = event.data;
      if (data.type === 'MP_EXT_CHECK_AUTH_RESPONSE' && data.requestId === requestId) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          window.removeEventListener('message', handleMessage);
          if (data.active) {
            (window as any).__MP_EXTENSION_ACTIVE__ = true;
          }
          resolve(Boolean(data.active));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'MP_EXT_CHECK_AUTH', requestId }, '*');
  });
}

export function getYouTubeAuthStatus(timeoutMs = 3000): Promise<YouTubeAuthStatus> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ connected: false, hasCookie: false });
  }

  const requestId = generateRequestId();
  return new Promise<YouTubeAuthStatus>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener('message', handleMessage);
        resolve({ connected: false, hasCookie: false });
      }
    }, timeoutMs);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      const data = event.data;
      if (data.type === 'MP_EXT_GET_ACCOUNT_RESPONSE' && data.requestId === requestId) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          window.removeEventListener('message', handleMessage);
          const payload = data.data || data;
          resolve({
            connected: Boolean(payload.connected),
            hasCookie: Boolean(payload.hasCookie),
            account: payload.account || undefined,
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'MP_EXT_GET_ACCOUNT', requestId }, '*');
  });
}

export function fetchAuthenticated<T = any>(
  urlOrEndpoint: string,
  body?: any,
  timeoutMs = 15000
): Promise<T> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('[WebExtensionAdapter] Cannot be used in non-browser context'));
  }

  const requestId = generateRequestId();
  const endpoint = urlOrEndpoint.startsWith('http')
    ? urlOrEndpoint
    : `https://music.youtube.com${urlOrEndpoint.startsWith('/') ? '' : '/'}${urlOrEndpoint}`;

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener('message', handleMessage);
        reject(new Error(`[WebExtensionAdapter] Authenticated fetch timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      const data = event.data;
      if (data.type === 'MP_EXT_AUTHENTICATED_FETCH_RESPONSE' && data.requestId === requestId) {
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', handleMessage);

        if (data.error) {
          reject(new Error(`[WebExtensionAdapter] ${data.error}`));
          return;
        }

        if (data.ok === false) {
          reject(new Error(`[WebExtensionAdapter] HTTP ${data.status || 500}: ${data.statusText || 'Fetch failed'}`));
          return;
        }
        const result = data.data !== undefined ? data.data : data.response !== undefined ? data.response : data;
        resolve(result as T);
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage(
      {
        type: 'MP_EXT_AUTHENTICATED_FETCH',
        requestId,
        endpoint,
        url: endpoint,
        body,
      },
      '*'
    );
  });
}
