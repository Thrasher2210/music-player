/**
 * Pluggable Network Adapters for InnerTube and streaming transport
 */

export interface NetworkAdapter {
  readonly name: string;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  postJson<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>;
}

/**
 * Native direct fetch adapter (Used in Electron, Mobile, Node, and unrestricted environments)
 */
export class NativeHttpAdapter implements NetworkAdapter {
  readonly name = 'native-http';

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
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
      throw new Error(`[NativeHttpAdapter] HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

/**
 * DevProxyAdapter: Routes metadata requests through a local proxy endpoint (e.g. Next.js /api/yt/*)
 * Enables zero-install instant web streaming without CORS restrictions.
 */
export interface DevProxyOptions {
  proxyBaseUrl?: string; // defaults to '/api/yt'
}

export class DevProxyAdapter implements NetworkAdapter {
  readonly name = 'dev-proxy';
  private proxyBaseUrl: string;

  constructor(options: DevProxyOptions = {}) {
    this.proxyBaseUrl = options.proxyBaseUrl || '/api/yt';
  }

  private resolveUrl(targetUrl: string): string {
    try {
      const parsed = new URL(targetUrl);
      const cleanPath = parsed.pathname.replace(/^\/youtubei\/v1/, '');
      const search = parsed.search;
      return `${this.proxyBaseUrl}${cleanPath}${search}`;
    } catch {
      return targetUrl;
    }
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const proxiedUrl = this.resolveUrl(url);
    const headers = new Headers(init?.headers);
    if (!headers.has('x-target-url')) {
      headers.set('x-target-url', url);
    }

    return fetch(proxiedUrl, {
      ...init,
      headers,
    });
  }

  async postJson<T = any>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    const proxiedUrl = this.resolveUrl(url);
    const response = await fetch(proxiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'x-target-url': url,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`[DevProxyAdapter] HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

/**
 * WebExtensionAdapter: Communicates with WXT / WebExtension background via window.postMessage bridge.
 * Enables DNR header modification (Referer, Origin, SAPISIDHASH) and CORS bypass in web apps.
 */
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

export class WebExtensionAdapter implements NetworkAdapter {
  readonly name = 'web-extension';
  private timeoutMs: number;

  constructor(timeoutMs = 15000) {
    this.timeoutMs = timeoutMs;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    if (typeof window === 'undefined') {
      throw new Error('[WebExtensionAdapter] Cannot be used in non-browser context');
    }

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
        if (resp.requestId !== requestId) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', handleMessage);

        if (resp.error) {
          reject(new Error(`[WebExtensionAdapter] ${resp.error}`));
          return;
        }

        const bodyData = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
        const response = new Response(bodyData, {
          status: resp.status || 200,
          statusText: resp.statusText || 'OK',
          headers: resp.headers || {},
        });

        resolve(response);
      };

      window.addEventListener('message', handleMessage);

      const msg: ExtensionBridgeRequest = {
        type: 'MP_EXT_FETCH_REQUEST',
        requestId,
        url,
        method: init?.method || 'GET',
        headers: headersObj,
        body: bodyStr,
      };

      window.postMessage(msg, '*');
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
}
