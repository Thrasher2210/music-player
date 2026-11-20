export type FetchTargetKind = "youtube" | "googlevideo" | "app";

export interface FetchTarget {
  url: URL;
  kind: FetchTargetKind;
}

export function isYouTubeHost(hostname: string): boolean {
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}

export function isGoogleVideoHost(hostname: string): boolean {
  return hostname.endsWith(".googlevideo.com");
}

/**
 * Pages may only have the extension fetch YouTube and googlevideo over https,
 * or a URL on their own (already allowed) origin.
 */
export function parseFetchTarget(raw: string, appOrigin: string | null): FetchTarget | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;

  if (appOrigin !== null && url.origin === appOrigin) {
    return { url, kind: "app" };
  }
  if (url.protocol !== "https:" || url.port !== "") return null;
  if (isYouTubeHost(url.hostname)) return { url, kind: "youtube" };
  if (isGoogleVideoHost(url.hostname)) return { url, kind: "googlevideo" };
  return null;
}
