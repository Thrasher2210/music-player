import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { createAuthUser, type AuthUser } from "./helpers.js";

describe("Playlist trackCount in GET /api/playlists", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  async function createPlaylist(user: AuthUser, name: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/playlists",
      headers: user.headers,
      payload: { name },
    });
    assert.equal(res.statusCode, 201);
    return JSON.parse(res.body).playlist.id as string;
  }

  async function listPlaylists(user: AuthUser) {
    const res = await app.inject({ method: "GET", url: "/api/playlists", headers: user.headers });
    assert.equal(res.statusCode, 200);
    return JSON.parse(res.body).playlists as Array<{ id: string; name: string; trackCount: number }>;
  }

  it("returns 0 for an empty playlist", async () => {
    const user = await createAuthUser(app, "pl-count-empty");
    const id = await createPlaylist(user, "Empty");

    const playlists = await listPlaylists(user);
    assert.equal(playlists.find((p) => p.id === id)?.trackCount, 0);
  });

  it("counts the tracks of each playlist separately and keeps other fields", async () => {
    const user = await createAuthUser(app, "pl-count-many");
    const twoTracks = await createPlaylist(user, "Two");
    const oneTrack = await createPlaylist(user, "One");

    await app.inject({
      method: "POST",
      url: `/api/playlists/${twoTracks}/tracks`,
      headers: user.headers,
      payload: {
        tracks: [
          { videoId: "cnt-a", title: "A", artist: "X" },
          { videoId: "cnt-b", title: "B", artist: "X" },
        ],
      },
    });
    await app.inject({
      method: "POST",
      url: `/api/playlists/${oneTrack}/tracks`,
      headers: user.headers,
      payload: { tracks: [{ videoId: "cnt-c", title: "C", artist: "X" }] },
    });

    const playlists = await listPlaylists(user);
    assert.equal(playlists.length, 2);
    const two = playlists.find((p) => p.id === twoTracks);
    assert.equal(two?.name, "Two");
    assert.equal(two?.trackCount, 2);
    assert.equal(playlists.find((p) => p.id === oneTrack)?.trackCount, 1);
  });

  it("does not count tracks of other users' playlists", async () => {
    const owner = await createAuthUser(app, "pl-count-owner");
    const other = await createAuthUser(app, "pl-count-other");
    const ownerPlaylist = await createPlaylist(owner, "Owner");
    await createPlaylist(other, "Other");

    await app.inject({
      method: "POST",
      url: `/api/playlists/${ownerPlaylist}/tracks`,
      headers: owner.headers,
      payload: { tracks: [{ videoId: "cnt-d", title: "D", artist: "X" }] },
    });

    const otherPlaylists = await listPlaylists(other);
    assert.equal(otherPlaylists.length, 1);
    assert.equal(otherPlaylists[0].trackCount, 0);
  });

  it("decreases after a track is removed", async () => {
    const user = await createAuthUser(app, "pl-count-remove");
    const id = await createPlaylist(user, "Removal");
    await app.inject({
      method: "POST",
      url: `/api/playlists/${id}/tracks`,
      headers: user.headers,
      payload: {
        tracks: [
          { videoId: "cnt-e", title: "E", artist: "X" },
          { videoId: "cnt-f", title: "F", artist: "X" },
        ],
      },
    });
    await app.inject({
      method: "DELETE",
      url: `/api/playlists/${id}/tracks/cnt-e`,
      headers: user.headers,
    });

    const playlists = await listPlaylists(user);
    assert.equal(playlists.find((p) => p.id === id)?.trackCount, 1);
  });
});
