import type { FastifyPluginAsync } from "fastify";
import { auth } from "../auth.js";
import { getDb, schema } from "@mp/db";
import { eq, desc, and, sql } from "drizzle-orm";

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
    const body = (req.body ?? {}) as {
      name?: string;
      source?: "local" | "spotify" | "youtube";
      ytPlaylistId?: string;
      coverArt?: string;
      description?: string;
    };
    if (!body.name?.trim()) {
      return reply.status(400).send({ error: "name_required" });
    }
    const [row] = await db
      .insert(schema.playlists)
      .values({
        userId,
        name: body.name.trim(),
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
    const { id } = req.params as { id: string };
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
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as {
      tracks?: Array<{
        videoId: string;
        title: string;
        artist: string;
        albumArt?: string | null;
        durationMs?: number;
      }>;
      position?: number;
    };
    if (!body.tracks?.length) {
      return reply.status(400).send({ error: "tracks_required" });
    }
    const [playlist] = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, id))
      .limit(1);
    if (!playlist || playlist.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.playlistId, id));
    let pos = body.position ?? count;
    const values = body.tracks.map((t) => ({
      playlistId: id,
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      albumArt: t.albumArt ?? null,
      durationMs: t.durationMs ?? 0,
      position: pos++,
    }));
    await db.insert(schema.playlistTracks).values(values);
    return reply.status(201).send({ added: values.length });
  });

  app.delete("/:id/tracks/:videoId", async (req, reply) => {
    const userId = await requireUser(req);
    const { id, videoId } = req.params as { id: string; videoId: string };
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
    const { id } = req.params as { id: string };
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
