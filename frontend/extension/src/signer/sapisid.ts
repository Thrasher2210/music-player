/**
 * Computes the SAPISIDHASH authorization header value for YouTube authentication.
 *
 * @param sapisid The SAPISID cookie value (e.g. SAPISID, __Secure-3PAPISID, or __Secure-1PAPISID).
 * @param origin The request origin (defaults to "https://music.youtube.com").
 * @returns The authorization header string: "SAPISIDHASH <timestamp>_<hex>"
 */
export async function computeSapisidHash(
  sapisid: string,
  origin: string = "https://music.youtube.com"
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(timestamp + " " + sapisid + " " + origin)
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `SAPISIDHASH ${timestamp}_${hex}`;
}

export const getSapisidHash = computeSapisidHash;
