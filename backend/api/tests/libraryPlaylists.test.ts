import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { createAuthUser } from "./helpers.js";

describe("Library Playlists Integration Tests", () => {
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
    const unauthCases = [
      { method: "GET" as const, url: "/api/playlists" },
      { method: "POST" as const, url: "/api/playlists", payload: { name: "My Playlist" } },
      { method: "GET" as const, url: "/api/playlists/00000000-0000-0000-0000-000000000000/tracks" },
      {
        method: "POST" as const,
        url: "/api/playlists/00000000-0000-0000-0000-000000000000/tracks",
        payload: { tracks: [{ videoId: "v1", title: "T1", artist: "A1" }] },
      },
      { method: "DELETE" as const, url: "/api/playlists/00000000-0000-0000-0000-000000000000/tracks/v1" },
      { method: "DELETE" as const, url: "/api/playlists/00000000-0000-0000-0000-000000000000" },
    ];

    for (const c of unauthCases) {
      it(`rejects ${c.method} ${c.url} without session (401)`, async () => {
        const res = await app.inject({ method: c.method, url: c.url, payload: c.payload });
        assert.equal(res.statusCode, 401);
      });
    }
  });

  // -------------------------------------------------------------
  // Playlists API Tests
  // -------------------------------------------------------------
  describe("Playlists API", () => {
    it("validates required name when creating playlist", async () => {
      const user = await createAuthUser(app, "pl-val");
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
      const user = await createAuthUser(app, "pl-crud");
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
      const user = await createAuthUser(app, "pl-tracks");
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
            { videoId: "track_1", title: "Lofi Track 1", artist: "ChilledCow", albumArt: "https://example.com/art1.jpg", durationMs: 180000 },
            { videoId: "track_2", title: "Lofi Track 2", artist: "Kudasa", albumArt: "https://example.com/art2.jpg", durationMs: 210000 },
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
      const user = await createAuthUser(app, "pl-del-track");
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
      const user = await createAuthUser(app, "pl-del");
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
      const userA = await createAuthUser(app, "pl-iso-a");
      const userB = await createAuthUser(app, "pl-iso-b");

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
});
