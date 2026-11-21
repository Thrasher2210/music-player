import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { RateLimitPluginOptions } from "@fastify/rate-limit";
import { getRedisClient } from "./redis.js";

export interface RateLimitOptions {
  enabled?: boolean;
  globalMax?: number;
  globalTimeWindow?: string | number;
}

function rateLimitError(retryAfter: string | number) {
  return {
    statusCode: 429,
    error: "Too Many Requests",
    message: `Rate limit exceeded, retry in ${retryAfter}`,
    retryAfter,
  };
}

/**
 * Builds the Fastify rate limit configuration.
 *
 * Requests are keyed by client IP only (the plugin default, resolved through
 * Fastify's `trustProxy`). Any key taken from a request header or cookie would
 * let a client pick its own bucket and dodge the limit.
 *
 * A Redis outage must not take the API down, so storage errors skip limiting.
 */
export function getRateLimitPluginOptions(opts?: RateLimitOptions): RateLimitPluginOptions {
  const redis = getRedisClient();

  return {
    global: true,
    max: opts?.globalMax ?? 120,
    timeWindow: opts?.globalTimeWindow ?? "1 minute",
    redis: redis ?? undefined,
    skipOnError: true,
    allowList: (req: FastifyRequest) => {
      const url = req.raw.url?.split("?")[0];
      // Healthcheck is never rate limited
      if (url === "/healthz" || url?.startsWith("/healthz/")) {
        return true;
      }
      return false;
    },
    errorResponseBuilder: (_req, context) => rateLimitError(context.after),
  };
}

/**
 * Better Auth is mounted in a raw onRequest hook, so the plugin's route hooks
 * never see /api/auth/*. Better Auth has its own sign-in limiter, but it is
 * in memory and per process. This adds a per-IP bucket for credential
 * endpoints that uses the same store and key as the rest and runs first.
 */
const CREDENTIAL_ROUTE = /^\/api\/auth\/(sign-in|sign-up)\//;

export function isCredentialRoute(method: string, url: string): boolean {
  return method === "POST" && CREDENTIAL_ROUTE.test(url.split("?")[0] ?? "");
}

export type CredentialRateLimiter = (req: FastifyRequest, reply: FastifyReply) => Promise<boolean>;

/**
 * Returns a function that answers 429 and resolves to true when the request is
 * a credential request over its limit. Resolves to false otherwise.
 */
export function createCredentialRateLimiter(app: FastifyInstance): CredentialRateLimiter {
  const check = app.createRateLimit({ max: 5, timeWindow: "1 minute" });

  return async (req, reply) => {
    if (!isCredentialRoute(req.method, req.raw.url ?? "")) return false;

    const limit = await check(req);
    if (limit.isAllowed || !limit.isExceeded) return false;

    await reply
      .code(429)
      .header("retry-after", limit.ttlInSeconds)
      .header("x-ratelimit-limit", limit.max)
      .header("x-ratelimit-remaining", 0)
      .header("x-ratelimit-reset", limit.ttlInSeconds)
      .send(rateLimitError(`${limit.ttlInSeconds} seconds`));
    return true;
  };
}

/**
 * Route-specific rate limit configurations
 */
export const lyricsRateLimitConfig = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: "1 minute",
    },
  },
};

export const importRateLimitConfig = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 minute",
    },
  },
};

export const crudRateLimitConfig = {
  config: {
    rateLimit: {
      max: 120,
      timeWindow: "1 minute",
    },
  },
};
