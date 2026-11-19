import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { createAuthUser } from "./helpers.js";

describe("Library Likes Integration Tests", () => {
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
    it("rejects GET /api/likes without session (401)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/likes",
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects PUT /api/likes/:videoId without session (401)", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/likes/test_vid_1",
        payload: { title: "Test Song", artist: "Test Artist" },
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects DELETE /api/likes/:videoId without session (401)", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/likes/test_vid_1",
      });
      assert.equal(res.statusCode, 401);
    });
  });

  // -------------------------------------------------------------
  // Likes API Tests
  // -------------------------------------------------------------
  describe("Likes API", () => {
    it("returns empty likes list for a fresh user", async () => {
      const user = await createAuthUser(app, "likes-fresh");
      const res = await app.inject({
        method: "GET",
        url: "/api/likes",
        headers: user.headers,
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(Array.isArray(data.likes));
      assert.equal(data.likes.length, 0);
    });

    it("validates title and artist required when adding like", async () => {
      const user = await createAuthUser(app, "likes-val");
      const res = await app.inject({
        method: "PUT",
        url: "/api/likes/vid_val_1",
        headers: user.headers,
        payload: { title: "Only Title" },
      });

      assert.equal(res.statusCode, 400);
      const data = JSON.parse(res.body);
      assert.equal(data.error, "title_artist_required");
    });

    it("saves a like via PUT /api/likes/:videoId and retrieves it via GET /api/likes", async () => {
      const user = await createAuthUser(app, "likes-crud");
      const videoId = "like_vid_123";
      const payload = {
        title: "Midnight City",
        artist: "M83",
        albumArt: "https://example.com/art.jpg",
      };

      const putRes = await app.inject({
        method: "PUT",
        url: `/api/likes/${videoId}`,
        headers: user.headers,
        payload,
      });

      assert.equal(putRes.statusCode, 200);
      assert.deepEqual(JSON.parse(putRes.body), { ok: true });

      // Retrieve likes
      const getRes = await app.inject({
        method: "GET",
        url: "/api/likes",
        headers: user.headers,
      });

      assert.equal(getRes.statusCode, 200);
      const data = JSON.parse(getRes.body);
      assert.ok(Array.isArray(data.likes));
      assert.equal(data.likes.length, 1);
      assert.equal(data.likes[0].videoId, videoId);
      assert.equal(data.likes[0].title, payload.title);
      assert.equal(data.likes[0].artist, payload.artist);
      assert.equal(data.likes[0].albumArt, payload.albumArt);
      assert.equal(data.likes[0].userId, user.userId);
    });

    it("handles duplicate PUT /api/likes/:videoId idempotently", async () => {
      const user = await createAuthUser(app, "likes-idempotent");
      const videoId = "like_dup_1";
      const payload = { title: "Starboy", artist: "The Weeknd" };

      const res1 = await app.inject({
        method: "PUT",
        url: `/api/likes/${videoId}`,
        headers: user.headers,
        payload,
      });
      assert.equal(res1.statusCode, 200);

      const res2 = await app.inject({
        method: "PUT",
        url: `/api/likes/${videoId}`,
        headers: user.headers,
        payload,
      });
      assert.equal(res2.statusCode, 200);

      const getRes = await app.inject({
        method: "GET",
        url: "/api/likes",
        headers: user.headers,
      });
      const data = JSON.parse(getRes.body);
      assert.equal(data.likes.length, 1);
    });

    it("removes like via DELETE /api/likes/:videoId", async () => {
      const user = await createAuthUser(app, "likes-del");
      const videoId = "like_to_delete";

      // Like track
      await app.inject({
        method: "PUT",
        url: `/api/likes/${videoId}`,
        headers: user.headers,
        payload: { title: "Song To Delete", artist: "Artist" },
      });

      // Verify exists
      const beforeRes = await app.inject({
        method: "GET",
        url: "/api/likes",
        headers: user.headers,
      });
      assert.equal(JSON.parse(beforeRes.body).likes.length, 1);

      // Delete like
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/likes/${videoId}`,
        headers: user.headers,
      });
      assert.equal(delRes.statusCode, 200);
      assert.deepEqual(JSON.parse(delRes.body), { ok: true });

      // Verify removed
      const afterRes = await app.inject({
        method: "GET",
        url: "/api/likes",
        headers: user.headers,
      });
      assert.equal(JSON.parse(afterRes.body).likes.length, 0);
    });

    it("isolates likes between different users", async () => {
      const userA = await createAuthUser(app, "likes-iso-a");
      const userB = await createAuthUser(app, "likes-iso-b");

      await app.inject({
        method: "PUT",
        url: "/api/likes/shared_song",
        headers: userA.headers,
        payload: { title: "Shared Song", artist: "Artist" },
      });

      const resB = await app.inject({
        method: "GET",
        url: "/api/likes",
        headers: userB.headers,
      });
      assert.equal(JSON.parse(resB.body).likes.length, 0);
    });
  });
});
