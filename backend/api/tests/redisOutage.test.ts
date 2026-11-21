import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";

// Nothing listens here, so every Redis command fails. Set before the server
// creates its client. node:test runs each file in its own process.
process.env.REDIS_URL = "redis://127.0.0.1:6399";

const { buildServer } = await import("../src/server.js");

describe("API while Redis is unreachable", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer({ logger: false, rateLimit: { enabled: true, globalMax: 5 } });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  async function timed(url: string) {
    const started = performance.now();
    const res = await app.inject({ method: "GET", url });
    return { res, ms: performance.now() - started };
  }

  it("keeps serving requests instead of returning 500", async () => {
    const playlists = await timed("/api/playlists");
    assert.equal(playlists.res.statusCode, 401);

    const lyrics = await timed("/api/lyrics");
    assert.equal(lyrics.res.statusCode, 400);
  });

  it("does not slow requests down", async () => {
    for (let i = 0; i < 10; i++) {
      const { res, ms } = await timed("/api/playlists");
      assert.equal(res.statusCode, 401);
      assert.ok(ms < 250, `request ${i} took ${Math.round(ms)}ms`);
    }
  });

  it("still serves credential endpoints", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      payload: { email: "nobody@example.com", password: "wrong-password-123" },
    });
    assert.equal(res.statusCode, 401);
  });
});
