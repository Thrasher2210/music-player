import { NetworkAdapter } from './network';
import { YouTubeAuthStatus } from '../types';

export interface ExtensionBridgeRequest {
  type: 'MP_EXT_FETCH_REQUEST';
  requestId: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ExtensionBridgeResponse {
  type: 'MP_EXT_FETCH_RESPONSE';
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  error?: string;
}

/**
 * WebExtensionAdapter: Communicates with WXT / WebExtension background via window.postMessage bridge.
 * Enables DNR header modification (Referer, Origin, SAPISIDHASH) and CORS bypass in web apps.
 */
export class WebExtensionAdapter implements NetworkAdapter {
  readonly name = 'web-extension';
  private timeoutMs: number;

  constructor(timeoutMs = 15000) {
    this.timeoutMs = timeoutMs;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async fallbackProxyFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      const parsed = new URL(url);
      const cleanPath = parsed.pathname.replace(/^\/youtubei\/v1/, '');
      const proxiedUrl = `/api/yt${cleanPath}${parsed.search}`;
      const headers = new Headers(init?.headers);
      if (!headers.has('x-target-url')) headers.set('x-target-url', url);
      return await fetch(proxiedUrl, { ...init, headers });
    } catch {
      return await fetch(url, init);
    }
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    if (typeof window === 'undefined') {
      throw new Error('[WebExtensionAdapter] Cannot be used in non-browser context');
    }
    try {
      return await this.fetchViaExtension(url, init);
    } catch (err: any) {
      console.warn('[WebExtensionAdapter] Extension fetch failed, falling back to proxy:', err?.message || err);
      return this.fallbackProxyFetch(url, init);
    }
  }

  private fetchViaExtension(url: string, init?: RequestInit): Promise<Response> {
    const requestId = this.generateRequestId();
    const headersObj: Record<string, string> = {};
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => {
        headersObj[key] = value;
      });
    }

    const bodyStr = init?.body
      ? typeof init.body === 'string'
        ? init.body
        : JSON.stringify(init.body)
      : undefined;

    return new Promise<Response>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener('message', handleMessage);
          reject(new Error(`[WebExtensionAdapter] Request timed out after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);

      const handleMessage = (event: MessageEvent) => {
        if (event.source !== window || !event.data || event.data.type !== 'MP_EXT_FETCH_RESPONSE') {
          return;
        }

        const resp = event.data as ExtensionBridgeResponse;
        if (resp.requestId !== requestId) return;

        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', handleMessage);

        if (resp.error) {
          reject(new Error(`[WebExtensionAdapter] ${resp.error}`));
          return;
        }

        const bodyData = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
        resolve(
          new Response(bodyData, {
            status: resp.status || 200,
            statusText: resp.statusText || 'OK',
            headers: resp.headers || {},
          })
        );
      };

      window.addEventListener('message', handleMessage);
      window.postMessage(
        {
          type: 'MP_EXT_FETCH_REQUEST',
          requestId,
          url,
          method: init?.method || 'GET',
          headers: headersObj,
          body: bodyStr,
        },
        '*'
      );
    });
  }

  async postJson<T = any>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`[WebExtensionAdapter] HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async checkExtension(timeoutMs = 400): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    if ((window as any).__MP_EXTENSION_ACTIVE__) {
      return true;
    }

    const requestId = this.generateRequestId();
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
        if (
          data.type === 'MP_EXT_CHECK_AUTH_RESPONSE' &&
          data.requestId === requestId
        ) {
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

  async getYouTubeAuthStatus(timeoutMs = 3000): Promise<YouTubeAuthStatus> {
    if (typeof window === 'undefined') {
      return { connected: false, hasCookie: false };
    }

    const requestId = this.generateRequestId();
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
        if (
          data.type === 'MP_EXT_GET_ACCOUNT_RESPONSE' &&
          data.requestId === requestId
        ) {
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

  async fetchAuthenticated<T = any>(
    urlOrEndpoint: string,
    body?: any,
    timeoutMs = this.timeoutMs
  ): Promise<T> {
    if (typeof window === 'undefined') {
      throw new Error('[WebExtensionAdapter] Cannot be used in non-browser context');
    }

    const requestId = this.generateRequestId();
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
        if (
          data.type === 'MP_EXT_AUTHENTICATED_FETCH_RESPONSE' &&
          data.requestId === requestId
        ) {
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
}
