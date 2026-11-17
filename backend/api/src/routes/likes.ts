import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "./playlists.js";

export const likesRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.get("/", async (req) => {
    const userId = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.likes)
      .where(eq(schema.likes.userId, userId))
      .orderBy(desc(schema.likes.createdAt));
    return { likes: rows };
  });

  app.put("/:videoId", async (req, reply) => {
    const userId = await requireUser(req);
    const { videoId } = req.params as { videoId: string };
    const body = (req.body ?? {}) as {
      title?: string;
      artist?: string;
      albumArt?: string | null;
    };
    if (!body.title || !body.artist) {
      return reply.status(400).send({ error: "title_artist_required" });
    }
    await db
      .insert(schema.likes)
      .values({
        userId,
        videoId,
        title: body.title,
        artist: body.artist,
        albumArt: body.albumArt ?? null,
      })
      .onConflictDoNothing();
    return { ok: true };
  });

  app.delete("/:videoId", async (req) => {
    const userId = await requireUser(req);
    const { videoId } = req.params as { videoId: string };
    await db
      .delete(schema.likes)
      .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId)));
    return { ok: true };
  });
};
