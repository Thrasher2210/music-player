import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@mp/db";
import { buildServer } from "../src/server.js";

describe("Rate Limiting Integration Tests", () => {
  let app: FastifyInstance;
  let runId = 0;
  const getUniqueIp = () => `192.168.${Math.floor(Math.random() * 200) + 10}.${++runId}`;
  // Outside the private ranges, so it counts as a client address and not a trusted proxy hop
  const getPublicIp = () =>
    `100.${64 + Math.floor(Math.random() * 64)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;

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

  it("does not let a client pick its own bucket through the Authorization header", async () => {
    const sharedIp = getUniqueIp();

    // Every request carries a different bearer token, all from the same IP
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: {
          authorization: `Bearer random-${i}-${Math.random()}`,
          "x-forwarded-for": sharedIp,
        },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: {
        authorization: `Bearer random-last-${Math.random()}`,
        "x-forwarded-for": sharedIp,
      },
    });
    assert.equal(res.statusCode, 429);
  });

  it("does not let a client pick its own bucket through the session cookie", async () => {
    const sharedIp = getUniqueIp();

    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: {
          cookie: `better-auth.session_token=random-${i}-${Math.random()}`,
          "x-forwarded-for": sharedIp,
        },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: {
        cookie: `better-auth.session_token=random-last-${Math.random()}`,
        "x-forwarded-for": sharedIp,
      },
    });
    assert.equal(res.statusCode, 429);
  });

  it("ignores X-Forwarded-For entries the client adds ahead of the proxy's own", async () => {
    const clientIp = getPublicIp();

    // A proxy appends the real client IP, the client can only prepend spoofed ones
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: { "x-forwarded-for": `${getPublicIp()}, ${clientIp}` },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/playlists",
      headers: { "x-forwarded-for": `${getPublicIp()}, ${clientIp}` },
    });
    assert.equal(res.statusCode, 429);
  });

  describe("credential endpoints", () => {
    const signIn = (clientIp: string) =>
      app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": `${getPublicIp()}, ${clientIp}`,
        },
        payload: { email: "nobody@example.com", password: "wrong-password-123" },
      });

    it("limits sign-in to 5 per minute per IP even when X-Forwarded-For is rotated", async () => {
      const clientIp = getPublicIp();

      for (let i = 1; i <= 5; i++) {
        const res = await signIn(clientIp);
        assert.equal(res.statusCode, 401, `Attempt ${i} should reach auth and fail with 401`);
      }

      const throttled = await signIn(clientIp);
      assert.equal(throttled.statusCode, 429);
      assert.ok(throttled.headers["retry-after"] !== undefined);
      assert.equal(JSON.parse(throttled.body).error, "Too Many Requests");

      // A different client IP is not affected
      const other = await signIn(getPublicIp());
      assert.equal(other.statusCode, 401);
    });

    it("gives Better Auth the client address Fastify resolved, not the raw header", async () => {
      const clientIp = getPublicIp();
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": `${getPublicIp()}, ${clientIp}`,
        },
        payload: {
          email: `ip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
          password: "TestPassword123!",
          name: "Ip Check",
        },
      });
      assert.equal(res.statusCode, 200, res.body);

      const [row] = await getDb()
        .select({ ipAddress: schema.session.ipAddress })
        .from(schema.session)
        .where(eq(schema.session.userId, JSON.parse(res.body).user.id));
      assert.equal(row?.ipAddress, clientIp);
    });

    it("shares one bucket between sign-in and sign-up, apart from the global one", async () => {
      const clientIp = getPublicIp();
      for (let i = 0; i < 5; i++) await signIn(clientIp);

      const signUp = await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": clientIp,
        },
        payload: { email: "x@example.com", password: "password-12345", name: "X" },
      });
      assert.equal(signUp.statusCode, 429);

      // Other auth endpoints and the global bucket (max 5 here) stay available
      const session = await app.inject({
        method: "GET",
        url: "/api/auth/get-session",
        headers: { "x-forwarded-for": clientIp },
      });
      assert.equal(session.statusCode, 200);

      const playlists = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: { "x-forwarded-for": clientIp },
      });
      assert.equal(playlists.statusCode, 401);
    });
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
