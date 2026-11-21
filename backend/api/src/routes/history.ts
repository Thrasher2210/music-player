import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { sql, eq } from "drizzle-orm";
import { requireUser } from "./playlists.js";
import { historyBody, parseRequest } from "./schemas.js";

export const historyRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.post("/", async (req, reply) => {
    const userId = await requireUser(req);
    const body = parseRequest(historyBody, req.body ?? {});
    await db.insert(schema.playHistory).values({
      userId,
      videoId: body.videoId,
      msPlayed: body.msPlayed,
    });
    return reply.status(201).send({ ok: true });
  });

  app.get("/", async (req) => {
    const userId = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.playHistory)
      .where(eq(schema.playHistory.userId, userId))
      .orderBy(sql`played_at desc`)
      .limit(100);
    return { history: rows };
  });
};

