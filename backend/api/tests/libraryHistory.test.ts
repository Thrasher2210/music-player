import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { createAuthUser } from "./helpers.js";

describe("Library History Integration Tests", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // -------------------------------------------------------------
  // Unauthorized Access Tests
  // -------------------------------------------------------------
  describe("Unauthorized Access Rejection", () => {
    it("rejects GET /api/history without session (401)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/history",
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects POST /api/history without session (401)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/history",
        payload: { videoId: "v1", msPlayed: 10000 },
      });
      assert.equal(res.statusCode, 401);
    });
  });

  // -------------------------------------------------------------
  // Play History API Tests
  // -------------------------------------------------------------
  describe("Play History API", () => {
    it("returns empty history for a fresh user", async () => {
      const user = await createAuthUser(app, "hist-fresh");
      const res = await app.inject({
        method: "GET",
        url: "/api/history",
        headers: user.headers,
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(Array.isArray(data.history));
      assert.equal(data.history.length, 0);
    });

    it("validates videoId required when recording play history", async () => {
      const user = await createAuthUser(app, "hist-val");
      const res = await app.inject({
        method: "POST",
        url: "/api/history",
        headers: user.headers,
        payload: { msPlayed: 5000 },
      });

      assert.equal(res.statusCode, 400);
      const data = JSON.parse(res.body);
      assert.equal(data.error, "videoId_required");
    });

    it("records play history via POST /api/history and retrieves recent history via GET /api/history", async () => {
      const user = await createAuthUser(app, "hist-crud");
      const videoId = "history_song_456";

      const postRes = await app.inject({
        method: "POST",
        url: "/api/history",
        headers: user.headers,
        payload: { videoId, msPlayed: 45000 },
      });

      assert.equal(postRes.statusCode, 201);
      assert.deepEqual(JSON.parse(postRes.body), { ok: true });

      // Retrieve history
      const getRes = await app.inject({
        method: "GET",
        url: "/api/history",
        headers: user.headers,
      });

      assert.equal(getRes.statusCode, 200);
      const data = JSON.parse(getRes.body);
      assert.ok(Array.isArray(data.history));
      assert.equal(data.history.length, 1);
      assert.equal(data.history[0].videoId, videoId);
      assert.equal(data.history[0].msPlayed, 45000);
      assert.equal(data.history[0].userId, user.userId);
      assert.ok(data.history[0].playedAt);
    });

    it("isolates history between different users", async () => {
      const userA = await createAuthUser(app, "hist-iso-a");
      const userB = await createAuthUser(app, "hist-iso-b");

      await app.inject({
        method: "POST",
        url: "/api/history",
        headers: userA.headers,
        payload: { videoId: "hist_vid_user_a", msPlayed: 12000 },
      });

      const resB = await app.inject({
        method: "GET",
        url: "/api/history",
        headers: userB.headers,
      });

      assert.equal(resB.statusCode, 200);
      const dataB = JSON.parse(resB.body);
      assert.equal(dataB.history.length, 0);
    });
  });
});
