import type { FastifyPluginAsync } from "fastify";
import { auth } from "../auth.js";
import { getDb, schema } from "@mp/db";
import { eq, desc, and, sql, gte, inArray } from "drizzle-orm";
import {
  addTracksBody,
  createPlaylistBody,
  idParams,
  parseRequest,
  playlistTrackParams,
} from "./schemas.js";

export const requireUser = async (req: any): Promise<string> => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    const err = new Error("unauthorized") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  return session.user.id;
};

export const playlistsRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.get("/", async (req) => {
    const userId = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.userId, userId))
      .orderBy(desc(schema.playlists.createdAt));
    return { playlists: rows };
  });

  app.post("/", async (req, reply) => {
    const userId = await requireUser(req);
    const body = parseRequest(createPlaylistBody, req.body ?? {});
    const [row] = await db
      .insert(schema.playlists)
      .values({
        userId,
        name: body.name,
        source: body.source === "youtube" ? "youtube" : "local",
        ytPlaylistId: body.ytPlaylistId,
        coverArt: body.coverArt,
        description: body.description,
      })
      .returning();
    return reply.status(201).send({ playlist: row });
  });

  app.get("/:id/tracks", async (req, reply) => {
    const userId = await requireUser(req);
    const { id } = parseRequest(idParams, req.params);
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, id))
      .limit(1);
    if (!playlist || playlist.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }
    const tracks = await db
      .select()
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.playlistId, id))
      .orderBy(schema.playlistTracks.position);
    return { playlist, tracks };
  });

  app.post("/:id/tracks", async (req, reply) => {
    const userId = await requireUser(req);
    const { id } = parseRequest(idParams, req.params);
    const body = parseRequest(addTracksBody, req.body ?? {});
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, id))
      .limit(1);
    if (!playlist || playlist.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }

    const incoming = new Map<string, (typeof body.tracks)[number]>();
    for (const t of body.tracks) {
      if (!incoming.has(t.videoId)) incoming.set(t.videoId, t);
    }

    const added = await db.transaction(async (tx) => {
      // Serialize concurrent adds to the same playlist so positions stay consistent.
      await tx
        .select({ id: schema.playlists.id })
        .from(schema.playlists)
        .where(eq(schema.playlists.id, id))
        .for("update");

      const existing = await tx
        .select({ videoId: schema.playlistTracks.videoId })
        .from(schema.playlistTracks)
        .where(
          and(
            eq(schema.playlistTracks.playlistId, id),
            inArray(schema.playlistTracks.videoId, [...incoming.keys()]),
          ),
        );
      for (const row of existing) incoming.delete(row.videoId);
      const fresh = [...incoming.values()];
      if (fresh.length === 0) return 0;

      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${schema.playlistTracks.position}) + 1, 0)::int` })
        .from(schema.playlistTracks)
        .where(eq(schema.playlistTracks.playlistId, id));
      const start = Math.min(body.position ?? next, next);
      if (start < next) {
        await tx
          .update(schema.playlistTracks)
          .set({ position: sql`${schema.playlistTracks.position} + ${fresh.length}` })
          .where(
            and(
              eq(schema.playlistTracks.playlistId, id),
              gte(schema.playlistTracks.position, start),
            ),
          );
      }

      const inserted = await tx
        .insert(schema.playlistTracks)
        .values(
          fresh.map((t, i) => ({
            playlistId: id,
            videoId: t.videoId,
            title: t.title,
            artist: t.artist,
            albumArt: t.albumArt ?? null,
            durationMs: t.durationMs ?? 0,
            position: start + i,
          })),
        )
        .onConflictDoNothing()
        .returning();
      return inserted.length;
    });
    return reply.status(201).send({ added });
  });

  app.delete("/:id/tracks/:videoId", async (req, reply) => {
    const userId = await requireUser(req);
    const { id, videoId } = parseRequest(playlistTrackParams, req.params);
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, id))
      .limit(1);
    if (!playlist || playlist.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }
    await db
      .delete(schema.playlistTracks)
      .where(
        and(
          eq(schema.playlistTracks.playlistId, id),
          eq(schema.playlistTracks.videoId, videoId),
        ),
      );
    return { ok: true, videoId };
  });

  app.delete("/:id", async (req, reply) => {
    const userId = await requireUser(req);
    const { id } = parseRequest(idParams, req.params);
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, id))
      .limit(1);
    if (!playlist || playlist.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }
    await db.delete(schema.playlists).where(eq(schema.playlists.id, id));
    return { ok: true };
  });
};
