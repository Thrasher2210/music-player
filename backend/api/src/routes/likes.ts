import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "./playlists.js";
import { likeBody, parseRequest, videoIdParams } from "./schemas.js";

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
    const { videoId } = parseRequest(videoIdParams, req.params);
    const body = parseRequest(likeBody, req.body ?? {});
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
    const { videoId } = parseRequest(videoIdParams, req.params);
    await db
      .delete(schema.likes)
      .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId)));
    return { ok: true };
  });
};
