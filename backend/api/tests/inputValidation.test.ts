import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@mp/db";
import { buildServer } from "../src/server.js";
import { createAuthUser, type AuthUser } from "./helpers.js";

const BAD_UUID = "not-a-uuid";
const GOOD_TRACK = { videoId: "vid_1", title: "Title", artist: "Artist" };

describe("API input validation", () => {
  let app: FastifyInstance;
  let user: AuthUser;
  let playlistId: string;

  before(async () => {
    app = await buildServer({ logger: false });
    app.get("/__boom", async () => {
      await getDb().execute(sql`select * from table_that_does_not_exist`);
    });
    await app.ready();
    user = await createAuthUser(app, "validation");
    const res = await app.inject({
      method: "POST",
      url: "/api/playlists",
      headers: user.headers,
      payload: { name: "Validation" },
    });
    playlistId = JSON.parse(res.body).playlist.id;
  });

  after(async () => {
    await app.close();
  });

  async function call(method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown) {
    return app.inject({ method, url, headers: user.headers, payload: payload as any });
  }

  function assertRejected(res: { statusCode: number; body: string }, error = "invalid_request") {
    assert.equal(res.statusCode, 400, res.body);
    assert.ok(!res.body.includes("Failed query"), `leaked SQL: ${res.body}`);
    const body = JSON.parse(res.body);
    assert.equal(body.error, error);
    assert.ok(Array.isArray(body.issues) && body.issues.length > 0);
  }

  describe("uuid params", () => {
    const cases: Array<[string, "GET" | "POST" | "DELETE", string, unknown?]> = [
      ["GET tracks", "GET", `/api/playlists/${BAD_UUID}/tracks`],
      ["POST tracks", "POST", `/api/playlists/${BAD_UUID}/tracks`, { tracks: [GOOD_TRACK] }],
      ["DELETE track", "DELETE", `/api/playlists/${BAD_UUID}/tracks/vid_1`],
      ["DELETE playlist", "DELETE", `/api/playlists/${BAD_UUID}`],
      ["GET import job", "GET", `/api/import/${BAD_UUID}`],
    ];
    for (const [name, method, url, payload] of cases) {
      it(`${name} with a malformed id is a 400, not a 500`, async () => {
        assertRejected(await call(method, url, payload));
      });
    }

    it("still answers 404 for a well formed id that does not exist", async () => {
      const res = await call("GET", "/api/playlists/00000000-0000-4000-8000-000000000000/tracks");
      assert.equal(res.statusCode, 404);
    });
  });

  describe("POST /api/playlists", () => {
    it("reports name_required when name is missing, blank or an empty body", async () => {
      assertRejected(await call("POST", "/api/playlists", {}), "name_required");
      assertRejected(await call("POST", "/api/playlists", { name: "   " }), "name_required");
      assertRejected(await call("POST", "/api/playlists"), "name_required");
    });

    it("rejects a non-string name", async () => {
      assertRejected(await call("POST", "/api/playlists", { name: 123 }));
    });

    it("rejects over-long fields and unknown sources", async () => {
      assertRejected(await call("POST", "/api/playlists", { name: "x".repeat(201) }));
      assertRejected(await call("POST", "/api/playlists", { name: "ok", description: "d".repeat(2001) }));
      assertRejected(await call("POST", "/api/playlists", { name: "ok", source: "spotify" }));
    });

    it("trims the name and accepts null optional fields", async () => {
      const res = await call("POST", "/api/playlists", {
        name: "  Trimmed  ",
        description: null,
        coverArt: null,
        source: "youtube",
        ytPlaylistId: "PL123",
      });
      assert.equal(res.statusCode, 201, res.body);
      const { playlist } = JSON.parse(res.body);
      assert.equal(playlist.name, "Trimmed");
      assert.equal(playlist.source, "youtube");
    });
  });

  describe("POST /api/playlists/:id/tracks", () => {
    const url = () => `/api/playlists/${playlistId}/tracks`;

    it("keeps tracks_required for missing or empty tracks", async () => {
      assertRejected(await call("POST", url(), {}), "tracks_required");
      assertRejected(await call("POST", url(), { tracks: [] }), "tracks_required");
    });

    it("rejects tracks that are not an array or are missing fields", async () => {
      assertRejected(await call("POST", url(), { tracks: "nope" }));
      assertRejected(await call("POST", url(), { tracks: [{ videoId: "zzz" }] }));
      assertRejected(await call("POST", url(), { tracks: [{ ...GOOD_TRACK, title: "" }] }));
      assertRejected(await call("POST", url(), { tracks: [{ ...GOOD_TRACK, durationMs: -1 }] }));
      assertRejected(await call("POST", url(), { tracks: [{ ...GOOD_TRACK, durationMs: 1.5 }] }));
    });

    it("rejects more than 200 tracks in one request", async () => {
      const tracks = Array.from({ length: 201 }, (_, i) => ({ ...GOOD_TRACK, videoId: `bulk_${i}` }));
      assertRejected(await call("POST", url(), { tracks }));
    });

    it("rejects a negative or fractional position", async () => {
      assertRejected(await call("POST", url(), { tracks: [GOOD_TRACK], position: 1.5 }));
      assertRejected(await call("POST", url(), { tracks: [GOOD_TRACK], position: -1 }));
    });
  });

  describe("POST /api/history", () => {
    it("rejects non-numeric, overflowing and negative msPlayed", async () => {
      assertRejected(await call("POST", "/api/history", { videoId: "v", msPlayed: "abc" }));
      assertRejected(await call("POST", "/api/history", { videoId: "v", msPlayed: 99999999999 }));
      assertRejected(await call("POST", "/api/history", { videoId: "v", msPlayed: -5 }));
    });

    it("rejects an over-long videoId and keeps videoId_required", async () => {
      assertRejected(await call("POST", "/api/history", { videoId: "v".repeat(65) }));
      assertRejected(await call("POST", "/api/history", { msPlayed: 10 }), "videoId_required");
    });

    it("defaults msPlayed to 0", async () => {
      const res = await call("POST", "/api/history", { videoId: "history_default" });
      assert.equal(res.statusCode, 201);
    });
  });

  describe("PUT /api/likes/:videoId", () => {
    it("rejects non-string title or artist, keeps title_artist_required", async () => {
      assertRejected(await call("PUT", "/api/likes/v", { title: 123, artist: "A" }));
      assertRejected(await call("PUT", "/api/likes/v", { title: "T" }), "title_artist_required");
    });
  });

  describe("POST /api/import/spotify", () => {
    it("rejects an unknown kind and does not store a job", async () => {
      assertRejected(await call("POST", "/api/import/spotify", { kind: "foo" }));
      const jobs = await getDb()
        .select()
        .from(schema.importJobs)
        .where(eq(schema.importJobs.userId, user.userId));
      assert.equal(jobs.length, 0);
    });

    it("defaults kind to liked_songs", async () => {
      const res = await call("POST", "/api/import/spotify");
      assert.equal(res.statusCode, 202);
      assert.equal(JSON.parse(res.body).job.kind, "liked_songs");
    });
  });

  describe("error handler", () => {
    it("answers unexpected database errors with a generic 500", async () => {
      const res = await app.inject({ method: "GET", url: "/__boom" });
      assert.equal(res.statusCode, 500);
      assert.deepEqual(JSON.parse(res.body), { statusCode: 500, error: "Internal Server Error" });
      assert.ok(!res.body.includes("Failed query"));
      assert.ok(!res.body.includes("table_that_does_not_exist"));
    });

    it("keeps the status and message of other 4xx errors", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/playlists",
        headers: { ...user.headers, "content-type": "application/json" },
        payload: "{bad",
      });
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.code, "FST_ERR_CTP_INVALID_JSON_BODY");
      assert.equal(body.error, "Bad Request");
    });

    it("still answers 401 for unauthenticated requests", async () => {
      const res = await app.inject({ method: "GET", url: "/api/playlists" });
      assert.equal(res.statusCode, 401);
      assert.deepEqual(JSON.parse(res.body), {
        statusCode: 401,
        error: "Unauthorized",
        message: "unauthorized",
      });
    });
  });
});
