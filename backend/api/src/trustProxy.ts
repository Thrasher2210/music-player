export type TrustProxy = boolean | string[] | ((address: string, hop: number) => boolean);

/**
 * Proxies on the same host or the private network (nginx on localhost, an
 * ALB or Render router inside the VPC). Any other peer is not trusted, so a
 * client that reaches the API directly cannot set its own IP through
 * X-Forwarded-For.
 */
export const DEFAULT_TRUST_PROXY: string[] = ["loopback", "linklocal", "uniquelocal"];

/**
 * Parses the TRUST_PROXY env var for Fastify's `trustProxy` option.
 *
 *   unset / empty            -> DEFAULT_TRUST_PROXY
 *   "2"                      -> trust that many proxy hops
 *   "true" / "false"         -> trust every hop / none
 *   "10.0.0.0/8,127.0.0.1"   -> trust only these proxy addresses
 *
 * Fastify does not accept a bare hop count, so it is turned into a function.
 * Only use a hop count when the API can never be reached except through those
 * proxies, otherwise a direct client can supply the trusted entry itself.
 */
export function parseTrustProxy(raw: string | undefined): TrustProxy {
  const value = raw?.trim();
  if (!value) return [...DEFAULT_TRUST_PROXY];

  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    return hops > 0 ? (_address, hop) => hop < hops : false;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
