import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

describe("Library Routes Integration Tests (Likes, Playlists, History)", () => {
  let app: FastifyInstance;

  // Helper to create an authenticated user session
  async function createAuthUser(emailPrefix: string) {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const password = "TestPassword123!";
    const name = `Test User ${emailPrefix}`;

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      payload: { email, password, name },
    });

    assert.equal(res.statusCode, 200, `Sign-up failed with status ${res.statusCode}: ${res.body}`);
    const data = JSON.parse(res.body);
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie, "Missing set-cookie header on sign up");
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;

    return {
      userId: data.user.id,
      email: data.user.email,
      name: data.user.name,
      sessionToken: data.token as string,
      cookieHeader,
      headers: {
        origin: "http://localhost:3000",
        cookie: cookieHeader,
      },
    };
  }

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // -------------------------------------------------------------
  // 1. Unauthorized Access Tests
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

    it("rejects GET /api/playlists without session (401)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/playlists",
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects POST /api/playlists without session (401)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/playlists",
        payload: { name: "My Playlist" },
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects GET /api/playlists/:id/tracks without session (401)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/playlists/00000000-0000-0000-0000-000000000000/tracks",
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects POST /api/playlists/:id/tracks without session (401)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/playlists/00000000-0000-0000-0000-000000000000/tracks",
        payload: { tracks: [{ videoId: "v1", title: "T1", artist: "A1" }] },
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects DELETE /api/playlists/:id/tracks/:videoId without session (401)", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/playlists/00000000-0000-0000-0000-000000000000/tracks/v1",
      });
      assert.equal(res.statusCode, 401);
    });

    it("rejects DELETE /api/playlists/:id without session (401)", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/playlists/00000000-0000-0000-0000-000000000000",
      });
      assert.equal(res.statusCode, 401);
    });

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
  // 2. Likes Routes Tests
  // -------------------------------------------------------------
  describe("Likes API", () => {
    it("returns empty likes list for a fresh user", async () => {
      const user = await createAuthUser("likes-fresh");
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
      const user = await createAuthUser("likes-val");
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
      const user = await createAuthUser("likes-crud");
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
      const user = await createAuthUser("likes-idempotent");
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
      const user = await createAuthUser("likes-del");
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
      const userA = await createAuthUser("likes-iso-a");
      const userB = await createAuthUser("likes-iso-b");

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

  // -------------------------------------------------------------
  // 3. Playlists Routes Tests
  // -------------------------------------------------------------
  describe("Playlists API", () => {
    it("validates required name when creating playlist", async () => {
      const user = await createAuthUser("pl-val");
      const res = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: user.headers,
        payload: { name: "   " },
      });

      assert.equal(res.statusCode, 400);
      const data = JSON.parse(res.body);
      assert.equal(data.error, "name_required");
    });

    it("creates a playlist via POST /api/playlists and lists user playlists via GET /api/playlists", async () => {
      const user = await createAuthUser("pl-crud");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: user.headers,
        payload: { name: "Synthwave Vibes" },
      });

      assert.equal(createRes.statusCode, 201);
      const createData = JSON.parse(createRes.body);
      assert.ok(createData.playlist);
      assert.equal(createData.playlist.name, "Synthwave Vibes");
      assert.equal(createData.playlist.userId, user.userId);
      assert.equal(createData.playlist.source, "local");
      const playlistId = createData.playlist.id;
      assert.ok(playlistId);

      // List user playlists
      const listRes = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: user.headers,
      });

      assert.equal(listRes.statusCode, 200);
      const listData = JSON.parse(listRes.body);
      assert.ok(Array.isArray(listData.playlists));
      assert.equal(listData.playlists.length, 1);
      assert.equal(listData.playlists[0].id, playlistId);
      assert.equal(listData.playlists[0].name, "Synthwave Vibes");
    });

    it("adds tracks to a playlist via POST /api/playlists/:id/tracks", async () => {
      const user = await createAuthUser("pl-tracks");
      const plRes = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: user.headers,
        payload: { name: "Study Beats" },
      });
      const playlistId = JSON.parse(plRes.body).playlist.id;

      // Validation: empty tracks array
      const emptyRes = await app.inject({
        method: "POST",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
        payload: { tracks: [] },
      });
      assert.equal(emptyRes.statusCode, 400);
      assert.equal(JSON.parse(emptyRes.body).error, "tracks_required");

      // Add two tracks
      const addRes = await app.inject({
        method: "POST",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
        payload: {
          tracks: [
            {
              videoId: "track_1",
              title: "Lofi Track 1",
              artist: "ChilledCow",
              albumArt: "https://example.com/art1.jpg",
              durationMs: 180000,
            },
            {
              videoId: "track_2",
              title: "Lofi Track 2",
              artist: "Kudasa",
              albumArt: "https://example.com/art2.jpg",
              durationMs: 210000,
            },
          ],
        },
      });

      assert.equal(addRes.statusCode, 201);
      const addData = JSON.parse(addRes.body);
      assert.equal(addData.added, 2);

      // Retrieve tracks via GET /api/playlists/:id/tracks
      const getTracksRes = await app.inject({
        method: "GET",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
      });

      assert.equal(getTracksRes.statusCode, 200);
      const getTracksData = JSON.parse(getTracksRes.body);
      assert.equal(getTracksData.playlist.id, playlistId);
      assert.equal(getTracksData.tracks.length, 2);
      assert.equal(getTracksData.tracks[0].videoId, "track_1");
      assert.equal(getTracksData.tracks[0].title, "Lofi Track 1");
      assert.equal(getTracksData.tracks[0].position, 0);
      assert.equal(getTracksData.tracks[1].videoId, "track_2");
      assert.equal(getTracksData.tracks[1].position, 1);
    });

    it("removes a single track via DELETE /api/playlists/:id/tracks/:videoId while preserving others", async () => {
      const user = await createAuthUser("pl-del-track");
      const plRes = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: user.headers,
        payload: { name: "Multi Track Test" },
      });
      const playlistId = JSON.parse(plRes.body).playlist.id;

      // Add 2 tracks
      await app.inject({
        method: "POST",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
        payload: {
          tracks: [
            { videoId: "track_keep", title: "Keep Me", artist: "Artist A" },
            { videoId: "track_remove", title: "Remove Me", artist: "Artist B" },
          ],
        },
      });

      // Delete only track_remove
      const delTrackRes = await app.inject({
        method: "DELETE",
        url: `/api/playlists/${playlistId}/tracks/track_remove`,
        headers: user.headers,
      });

      assert.equal(delTrackRes.statusCode, 200);
      const delTrackData = JSON.parse(delTrackRes.body);
      assert.equal(delTrackData.ok, true);
      assert.equal(delTrackData.videoId, "track_remove");

      // Verify track_keep is still present and track_remove is gone
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
      });
      const verifyData = JSON.parse(verifyRes.body);
      assert.equal(verifyData.tracks.length, 1);
      assert.equal(verifyData.tracks[0].videoId, "track_keep");
    });

    it("deletes a playlist and cascades track removal via DELETE /api/playlists/:id", async () => {
      const user = await createAuthUser("pl-del");
      const plRes = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: user.headers,
        payload: { name: "Playlist To Delete" },
      });
      const playlistId = JSON.parse(plRes.body).playlist.id;

      // Add a track
      await app.inject({
        method: "POST",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
        payload: {
          tracks: [{ videoId: "t1", title: "Title 1", artist: "Artist 1" }],
        },
      });

      // Delete playlist
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/playlists/${playlistId}`,
        headers: user.headers,
      });
      assert.equal(delRes.statusCode, 200);
      assert.deepEqual(JSON.parse(delRes.body), { ok: true });

      // Verify playlist is gone from user's playlists
      const listRes = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: user.headers,
      });
      const listData = JSON.parse(listRes.body);
      assert.ok(!listData.playlists.some((p: any) => p.id === playlistId));

      // Accessing deleted playlist returns 404
      const getRes = await app.inject({
        method: "GET",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: user.headers,
      });
      assert.equal(getRes.statusCode, 404);
    });

    it("enforces tenant isolation: User B cannot access or modify User A's playlist", async () => {
      const userA = await createAuthUser("pl-iso-a");
      const userB = await createAuthUser("pl-iso-b");

      // User A creates playlist
      const plRes = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: userA.headers,
        payload: { name: "User A Secret Playlist" },
      });
      const playlistId = JSON.parse(plRes.body).playlist.id;

      // User B tries to view tracks -> 404
      const getRes = await app.inject({
        method: "GET",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: userB.headers,
      });
      assert.equal(getRes.statusCode, 404);

      // User B tries to add tracks -> 404
      const addRes = await app.inject({
        method: "POST",
        url: `/api/playlists/${playlistId}/tracks`,
        headers: userB.headers,
        payload: {
          tracks: [{ videoId: "hack", title: "Hack", artist: "Hacker" }],
        },
      });
      assert.equal(addRes.statusCode, 404);

      // User B tries to delete playlist -> 404
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/playlists/${playlistId}`,
        headers: userB.headers,
      });
      assert.equal(delRes.statusCode, 404);
    });
  });

  // -------------------------------------------------------------
  // 4. Play History Routes Tests
  // -------------------------------------------------------------
  describe("Play History API", () => {
    it("returns empty history for a fresh user", async () => {
      const user = await createAuthUser("hist-fresh");
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
      const user = await createAuthUser("hist-val");
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
      const user = await createAuthUser("hist-crud");
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
      const userA = await createAuthUser("hist-iso-a");
      const userB = await createAuthUser("hist-iso-b");

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
