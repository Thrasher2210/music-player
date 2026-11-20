import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@mp/db";
import { buildServer } from "../src/server.js";
import { createAuthUser, type AuthUser } from "./helpers.js";

const newVideoId = () => `h${randomUUID().replace(/-/g, "").slice(0, 10)}`;

describe("Play history metadata", () => {
  let app: FastifyInstance;
  const db = getDb();

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  const record = (user: AuthUser, payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/history", headers: user.headers, payload });

  const history = async (user: AuthUser) => {
    const res = await app.inject({ method: "GET", url: "/api/history", headers: user.headers });
    assert.equal(res.statusCode, 200);
    return JSON.parse(res.body).history as Array<Record<string, unknown>>;
  };

  const trackRow = async (videoId: string) => {
    const [row] = await db.select().from(schema.tracks).where(eq(schema.tracks.videoId, videoId));
    return row;
  };

  it("returns the recorded title, artist, art and duration with each history row", async () => {
    const user = await createAuthUser(app, "hist-meta");
    const videoId = newVideoId();

    const res = await record(user, {
      videoId,
      msPlayed: 31000,
      title: "Song A",
      artist: "Artist A",
      albumArt: "https://example.com/a.jpg",
      durationSec: 215,
    });
    assert.equal(res.statusCode, 201);

    const [row] = await history(user);
    assert.equal(row.videoId, videoId);
    assert.equal(row.msPlayed, 31000);
    assert.equal(row.title, "Song A");
    assert.equal(row.artist, "Artist A");
    assert.equal(row.albumArt, "https://example.com/a.jpg");
    assert.equal(row.durationSec, 215);
  });

  it("returns nulls for plays recorded without metadata and does not create a track row", async () => {
    const user = await createAuthUser(app, "hist-nometa");
    const videoId = newVideoId();

    assert.equal((await record(user, { videoId, msPlayed: 1000 })).statusCode, 201);

    const [row] = await history(user);
    assert.equal(row.videoId, videoId);
    assert.equal(row.title, null);
    assert.equal(row.artist, null);
    assert.equal(row.albumArt, null);
    assert.equal(row.durationSec, null);
    assert.equal(await trackRow(videoId), undefined);
  });

  it("counts every play, keeps the first title and artist, and fills in missing art and duration", async () => {
    const first = await createAuthUser(app, "hist-count-a");
    const second = await createAuthUser(app, "hist-count-b");
    const videoId = newVideoId();

    await record(first, { videoId, title: "Original", artist: "Original Artist" });
    let track = await trackRow(videoId);
    assert.equal(track.playCount, 1);
    assert.equal(track.albumArt, null);
    assert.equal(track.durationSec, 0);

    await record(second, {
      videoId,
      title: "Renamed",
      artist: "Someone Else",
      albumArt: "https://example.com/late.jpg",
      durationSec: 180,
    });
    await record(first, { videoId, title: "Renamed again", artist: "Nobody", albumArt: "https://example.com/other.jpg", durationSec: 99 });

    track = await trackRow(videoId);
    assert.equal(track.playCount, 3);
    assert.equal(track.title, "Original");
    assert.equal(track.artist, "Original Artist");
    assert.equal(track.albumArt, "https://example.com/late.jpg");
    assert.equal(track.durationSec, 180);

    const [row] = await history(second);
    assert.equal(row.title, "Original");
  });

  it("lists the newest play first and keeps users apart", async () => {
    const user = await createAuthUser(app, "hist-order");
    const other = await createAuthUser(app, "hist-order-other");
    const older = newVideoId();
    const newer = newVideoId();

    await record(user, { videoId: older, title: "Older", artist: "A" });
    await record(user, { videoId: newer, title: "Newer", artist: "B" });
    await record(other, { videoId: newVideoId(), title: "Not mine", artist: "C" });

    const rows = await history(user);
    assert.deepEqual(rows.map((r) => r.videoId), [newer, older]);
    assert.ok(rows.every((r) => r.userId === user.userId));
  });

  it("rejects metadata that is incomplete or out of range", async () => {
    const user = await createAuthUser(app, "hist-invalid");
    const videoId = newVideoId();

    const titleOnly = await record(user, { videoId, title: "No artist" });
    assert.equal(titleOnly.statusCode, 400);
    assert.equal(JSON.parse(titleOnly.body).error, "title_artist_required");

    const artistOnly = await record(user, { videoId, artist: "No title" });
    assert.equal(artistOnly.statusCode, 400);

    for (const bad of [
      { title: "", artist: "A" },
      { title: "T", artist: "" },
      { title: "T", artist: "A", durationSec: -1 },
      { title: "T", artist: "A", durationSec: 12.5 },
      { title: "T", artist: "A", durationSec: 100000 },
      { title: "T".repeat(501), artist: "A" },
      { title: "T", artist: "A", albumArt: "a".repeat(2049) },
    ]) {
      const res = await record(user, { videoId, ...bad });
      assert.equal(res.statusCode, 400, JSON.stringify(bad));
      assert.ok(!res.body.includes("Failed query"));
    }

    assert.equal((await history(user)).length, 0);
    assert.equal(await trackRow(videoId), undefined);
  });
});
