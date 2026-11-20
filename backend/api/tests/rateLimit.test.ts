import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

describe("Rate Limiting Integration Tests", () => {
  let app: FastifyInstance;
  let runId = 0;
  const getUniqueIp = () => `192.168.${Math.floor(Math.random() * 200) + 10}.${++runId}`;

  before(async () => {
    // Build server with rate limiting explicitly enabled and a globalMax of 5 for testing
    app = await buildServer({
      logger: false,
      rateLimit: {
        enabled: true,
        globalMax: 5,
        globalTimeWindow: "1 minute",
      },
    });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it("never rate limits /healthz endpoint regardless of request volume", async () => {
    for (let i = 0; i < 15; i++) {
      const res = await app.inject({
        method: "GET",
        url: "/healthz",
      });
      assert.equal(res.statusCode, 200, `Expected 200 on iteration ${i}, got ${res.statusCode}`);
      const body = JSON.parse(res.body);
      assert.equal(body.ok, true);
    }
  });

  it("enforces rate limit on API endpoints and returns 429 once threshold exceeded", async () => {
    const testIp = getUniqueIp();

    // First 5 requests should pass through rate limiter (returns 401 unauthenticated, but not 429)
    for (let i = 1; i <= 5; i++) {
      const res = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: { "x-forwarded-for": testIp },
      });
      assert.equal(res.statusCode, 401, `Request ${i} should be 401 unauthenticated`);
      assert.ok(res.headers["x-ratelimit-remaining"] !== undefined);
    }

    // 6th request must be rejected with 429 Too Many Requests
    const resThrottled = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: { "x-forwarded-for": testIp },
    });

    assert.equal(resThrottled.statusCode, 429);
    assert.ok(resThrottled.headers["retry-after"] !== undefined);
    assert.equal(resThrottled.headers["x-ratelimit-remaining"], "0");

    const body = JSON.parse(resThrottled.body);
    assert.equal(body.statusCode, 429);
    assert.equal(body.error, "Too Many Requests");
    assert.ok(body.message.includes("Rate limit exceeded"));
  });

  it("isolates rate limit counters between different client IPs", async () => {
    const ipA = getUniqueIp();
    const ipB = getUniqueIp();

    // Exhaust quota for IP A
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: { "x-forwarded-for": ipA },
      });
    }

    // 6th request from IP A is throttled
    const resA = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: { "x-forwarded-for": ipA },
    });
    assert.equal(resA.statusCode, 429);

    // IP B should still be allowed
    const resB = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: { "x-forwarded-for": ipB },
    });
    assert.equal(resB.statusCode, 401);
  });

  it("keys rate limit by Bearer authorization header when provided", async () => {
    const unique = Date.now() + Math.random().toString();
    const tokenA = `Bearer test-token-alpha-${unique}`;
    const tokenB = `Bearer test-token-beta-${unique}`;
    const sharedIp = getUniqueIp();

    // Exhaust quota for Token A
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: {
          authorization: tokenA,
          "x-forwarded-for": sharedIp,
        },
      });
    }

    // Next request with Token A is throttled
    const resTokenA = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: {
        authorization: tokenA,
        "x-forwarded-for": sharedIp,
      },
    });
    assert.equal(resTokenA.statusCode, 429);

    // Request with Token B on same IP is NOT throttled
    const resTokenB = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: {
        authorization: tokenB,
        "x-forwarded-for": sharedIp,
      },
    });
    assert.equal(resTokenB.statusCode, 401);
  });

  it("enforces route-specific tier on /api/lyrics (30 req/min)", async () => {
    const lyricsIp = getUniqueIp();

    // Send 30 requests - all allowed by route rate limit (may return 400 bad query, but not 429)
    for (let i = 1; i <= 30; i++) {
      const res = await app.inject({
        method: "GET",
        url: "/api/lyrics",
        headers: { "x-forwarded-for": lyricsIp },
      });
      assert.notEqual(res.statusCode, 429, `Request ${i} should not be 429`);
    }

    // 31st request exceeds the route-specific limit of 30
    const resThrottled = await app.inject({
      method: "GET",
      url: "/api/lyrics",
      headers: { "x-forwarded-for": lyricsIp },
    });
    assert.equal(resThrottled.statusCode, 429);
  });
});
