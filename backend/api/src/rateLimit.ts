import type { FastifyRequest } from "fastify";
import type { RateLimitPluginOptions } from "@fastify/rate-limit";
import { getRedisClient } from "./redis.js";

export interface RateLimitOptions {
  enabled?: boolean;
  globalMax?: number;
  globalTimeWindow?: string | number;
}

/**
 * Extracts a stable client key for rate limiting:
 * 1. Bearer token from Authorization header if present.
 * 2. better-auth session token cookie if present.
 * 3. Client IP address (from trusted proxies).
 */
export function extractClientKey(req: FastifyRequest): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return `auth:${authHeader.slice(7).trim()}`;
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = /better-auth\.session_token=([^;]+)/.exec(cookieHeader);
    if (match && match[1]) {
      return `session:${match[1]}`;
    }
  }

  return req.ip || "127.0.0.1";
}

/**
 * Builds the Fastify rate limit configuration.
 */
export function getRateLimitPluginOptions(opts?: RateLimitOptions): RateLimitPluginOptions {
  const redis = getRedisClient();

  return {
    global: true,
    max: opts?.globalMax ?? 120,
    timeWindow: opts?.globalTimeWindow ?? "1 minute",
    redis: redis ?? undefined,
    keyGenerator: extractClientKey,
    allowList: (req: FastifyRequest) => {
      const url = req.raw.url?.split("?")[0];
      // Healthcheck is never rate limited
      if (url === "/healthz" || url?.startsWith("/healthz/")) {
        return true;
      }
      return false;
    },
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded, retry in ${context.after}`,
      retryAfter: context.after,
    }),
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
