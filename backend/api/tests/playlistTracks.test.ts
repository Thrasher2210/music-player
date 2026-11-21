import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { createAuthUser, type AuthUser } from "./helpers.js";

const track = (videoId: string) => ({ videoId, title: `Title ${videoId}`, artist: "Artist" });

describe("Playlist track adds", () => {
  let app: FastifyInstance;
  let user: AuthUser;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
    user = await createAuthUser(app, "pl-adds");
  });

  after(async () => {
    await app.close();
  });

  async function newPlaylist(): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/playlists",
      headers: user.headers,
      payload: { name: `Playlist ${Math.random()}` },
    });
    return JSON.parse(res.body).playlist.id;
  }

  async function add(playlistId: string, videoIds: string[], position?: number) {
    const res = await app.inject({
      method: "POST",
      url: `/api/playlists/${playlistId}/tracks`,
      headers: user.headers,
      payload: { tracks: videoIds.map(track), position },
    });
    assert.equal(res.statusCode, 201, res.body);
    return JSON.parse(res.body).added as number;
  }

  async function list(playlistId: string): Promise<Array<{ videoId: string; position: number }>> {
    const res = await app.inject({
      method: "GET",
      url: `/api/playlists/${playlistId}/tracks`,
      headers: user.headers,
    });
    return JSON.parse(res.body).tracks;
  }

  const order = async (playlistId: string) => (await list(playlistId)).map((t) => t.videoId);

  it("skips tracks already in the playlist and keeps the rest of the batch", async () => {
    const id = await newPlaylist();
    assert.equal(await add(id, ["aaa"]), 1);
    assert.equal(await add(id, ["aaa", "bbb"]), 1);
    assert.deepEqual(
      (await list(id)).map((t) => [t.videoId, t.position]),
      [["aaa", 0], ["bbb", 1]],
    );
  });

  it("returns added 0 when every track is already present", async () => {
    const id = await newPlaylist();
    await add(id, ["aaa", "bbb"]);
    assert.equal(await add(id, ["bbb", "aaa"]), 0);
    assert.deepEqual(await order(id), ["aaa", "bbb"]);
  });

  it("collapses a track repeated inside one request", async () => {
    const id = await newPlaylist();
    assert.equal(await add(id, ["aaa", "bbb", "aaa"]), 2);
    assert.deepEqual(
      (await list(id)).map((t) => [t.videoId, t.position]),
      [["aaa", 0], ["bbb", 1]],
    );
  });

  it("appends after the highest position so deleted tracks leave no collisions", async () => {
    const id = await newPlaylist();
    await add(id, ["a", "b", "c"]);
    const del = await app.inject({
      method: "DELETE",
      url: `/api/playlists/${id}/tracks/a`,
      headers: user.headers,
    });
    assert.equal(del.statusCode, 200);
    await add(id, ["d"]);
    assert.deepEqual(
      (await list(id)).map((t) => [t.videoId, t.position]),
      [["b", 1], ["c", 2], ["d", 3]],
    );
  });

  it("inserts at the requested position and shifts the tracks after it", async () => {
    const id = await newPlaylist();
    await add(id, ["a", "b", "c"]);
    assert.equal(await add(id, ["x", "y"], 1), 2);
    assert.deepEqual(
      (await list(id)).map((t) => [t.videoId, t.position]),
      [["a", 0], ["x", 1], ["y", 2], ["b", 3], ["c", 4]],
    );
  });

  it("does not shift for tracks that were skipped as duplicates", async () => {
    const id = await newPlaylist();
    await add(id, ["a", "b"]);
    assert.equal(await add(id, ["a", "x"], 0), 1);
    assert.deepEqual(
      (await list(id)).map((t) => [t.videoId, t.position]),
      [["x", 0], ["a", 1], ["b", 2]],
    );
  });

  it("appends when position is past the end", async () => {
    const id = await newPlaylist();
    await add(id, ["a", "b"]);
    await add(id, ["z"], 99);
    assert.deepEqual(
      (await list(id)).map((t) => [t.videoId, t.position]),
      [["a", 0], ["b", 1], ["z", 2]],
    );
  });

  it("keeps positions unique when adds race", async () => {
    const id = await newPlaylist();
    const added = await Promise.all(["a", "b", "c", "d", "e"].map((v) => add(id, [v])));
    assert.equal(added.reduce((sum, n) => sum + n, 0), 5);
    const positions = (await list(id)).map((t) => t.position).sort((a, b) => a - b);
    assert.deepEqual(positions, [0, 1, 2, 3, 4]);
  });

  it("stores a racing duplicate only once", async () => {
    const id = await newPlaylist();
    const added = await Promise.all([1, 2, 3, 4].map(() => add(id, ["same"])));
    assert.equal(added.reduce((sum, n) => sum + n, 0), 1);
    assert.deepEqual(await order(id), ["same"]);
  });
});
