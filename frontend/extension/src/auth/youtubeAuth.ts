import { computeSapisidHash } from "../signer/sapisid";
import { parseFetchTarget } from "../security/fetchTarget";

export const YTM_URL = "https://music.youtube.com/";
export const SAPISID_COOKIE_NAMES = [
  "SAPISID",
  "__Secure-3PAPISID",
  "__Secure-1PAPISID",
];

export interface SapisidCookie {
  name: string;
  value: string;
}

export interface AuthStatus {
  active: boolean;
  connected: boolean;
  hasCookie: boolean;
}

export interface AccountDetails {
  active: boolean;
  connected: boolean;
  name: string | null;
  avatarUrl: string | null;
  handle: string | null;
  account?: {
    name?: string;
    avatar?: string;
    avatarUrl?: string;
    handle?: string;
  } | null;
  error?: string;
}

export interface FetchResult {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Record<string, string>;
  data: any;
  error?: string;
}

export async function getSapisidCookie(): Promise<SapisidCookie | null> {
  const urls = [YTM_URL, "https://www.youtube.com/"];
  for (const name of SAPISID_COOKIE_NAMES) {
    for (const url of urls) {
      try {
        const cookie = await browser.cookies.get({ url, name });
        if (cookie && cookie.value) {
          return { name: cookie.name, value: cookie.value };
        }
      } catch {
        // Continue checking next candidate
      }
    }
  }
  return null;
}

export async function checkAuth(): Promise<AuthStatus> {
  const cookie = await getSapisidCookie();
  const hasCookie = Boolean(cookie && cookie.value);
  return {
    active: true,
    connected: hasCookie,
    hasCookie,
  };
}

export function extractAccountDetails(data: any): {
  name: string | null;
  avatarUrl: string | null;
  handle: string | null;
} {
  let name: string | null = null;
  let avatarUrl: string | null = null;
  let handle: string | null = null;

  function traverse(node: any) {
    if (!node || typeof node !== "object") return;

    const header =
      node.activeAccountHeaderRenderer ||
      node.accountHeaderRenderer ||
      node.googleAccountHeaderRenderer;

    if (header) {
      if (!name) {
        name =
          header.accountName?.simpleText ||
          header.accountName?.runs?.[0]?.text ||
          header.title?.simpleText ||
          header.title?.runs?.[0]?.text ||
          null;
      }
      if (!avatarUrl) {
        const thumbs =
          header.accountPhoto?.thumbnails ||
          header.avatar?.thumbnails ||
          header.thumbnail?.thumbnails ||
          header.photo?.thumbnails;
        if (Array.isArray(thumbs) && thumbs.length > 0) {
          avatarUrl = thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || null;
        }
      }
      if (!handle) {
        handle =
          header.channelHandle?.simpleText ||
          header.channelHandle?.runs?.[0]?.text ||
          header.handleText?.simpleText ||
          header.handleText?.runs?.[0]?.text ||
          null;
      }
    }

    for (const key of Object.keys(node)) {
      if (node[key] && typeof node[key] === "object") {
        traverse(node[key]);
      }
    }
  }

  traverse(data);
  return { name, avatarUrl, handle };
}

export async function getAccount(): Promise<AccountDetails> {
  const cookie = await getSapisidCookie();
  if (!cookie) {
    return {
      active: true,
      connected: false,
      name: null,
      avatarUrl: null,
      handle: null,
      account: null,
      error: "No SAPISID cookie found; user not signed in",
    };
  }

  try {
    const authHeader = await computeSapisidHash(cookie.value, YTM_URL);
    const response = await fetch(
      "https://music.youtube.com/youtubei/v1/account/account_menu",
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "X-Origin": "https://music.youtube.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB_REMIX",
              clientVersion: "1.20240101.01.00",
              hl: "en",
              gl: "US",
            },
          },
        }),
        credentials: "include",
      }
    );

    if (!response.ok) {
      return {
        active: true,
        connected: false,
        name: null,
        avatarUrl: null,
        handle: null,
        account: null,
        error: `Account menu fetch returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const details = extractAccountDetails(data);
    return {
      active: true,
      connected: true,
      name: details.name,
      avatarUrl: details.avatarUrl,
      handle: details.handle,
      account: {
        name: details.name || undefined,
        avatar: details.avatarUrl || undefined,
        avatarUrl: details.avatarUrl || undefined,
        handle: details.handle || undefined,
      },
    };
  } catch (err: any) {
    return {
      active: true,
      connected: false,
      name: null,
      avatarUrl: null,
      handle: null,
      account: null,
      error: err?.message || "Failed to fetch account menu",
    };
  }
}

function fetchFailure(error: string): FetchResult {
  return { status: 0, statusText: "Error", ok: false, headers: {}, data: null, error };
}

export async function authenticatedFetch(
  msg: any,
  appOrigin: string | null = null,
): Promise<FetchResult> {
  let targetUrl: string = typeof msg?.url === "string" && msg.url ? msg.url : YTM_URL;
  if (targetUrl.startsWith("/")) {
    targetUrl = `https://music.youtube.com${targetUrl}`;
  }

  const target = parseFetchTarget(targetUrl, appOrigin);
  if (!target) return fetchFailure("fetch target not allowed");

  const cookie = await getSapisidCookie();
  const requestHeaders: Record<string, string> = {
    ...(msg?.headers || {}),
  };

  const origin = target.url.origin;
  if (target.kind === "youtube") {
    let isMobile = false;
    if (msg?.body) {
      try {
        const parsed = typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;
        const cn = String(parsed?.context?.client?.clientName || "").toUpperCase();
        isMobile = cn === "IOS" || cn === "VISIONOS" || cn.startsWith("ANDROID") || cn.startsWith("TV");
      } catch {}
    }
    if (!isMobile && cookie && cookie.value && !requestHeaders["Authorization"]) {
      requestHeaders["Authorization"] = await computeSapisidHash(cookie.value, origin);
    }
    if (!isMobile && !requestHeaders["X-Origin"]) {
      requestHeaders["X-Origin"] = origin;
    }
  }

  let body = msg?.body;
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams)
  ) {
    body = JSON.stringify(body);
    if (!requestHeaders["Content-Type"] && !requestHeaders["content-type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  try {
    const res = await fetch(target.url, {
      method: msg?.method || (body ? "POST" : "GET"),
      headers: requestHeaders,
      body: body || undefined,
      credentials: target.kind === "app" ? "omit" : "include",
    });

    const contentType = res.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    return {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: responseHeaders,
      data,
    };
  } catch (err: any) {
    return fetchFailure(err?.message || "Authenticated fetch failed");
  }
}
