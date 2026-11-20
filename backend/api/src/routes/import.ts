import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { eq } from "drizzle-orm";
import { requireUser } from "./playlists.js";
import { importRateLimitConfig } from "../rateLimit.js";

// Phase 4: Spotify OAuth + BullMQ import pipeline.
// Scaffold enqueues nothing yet — routes + job-status shape only.
export const importRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.post("/spotify", importRateLimitConfig, async (req, reply) => {
    const userId = await requireUser(req);
    const body = (req.body ?? {}) as { kind?: "liked_songs" | "playlists" };
    const kind = body.kind ?? "liked_songs";
    const [job] = await db
      .insert(schema.importJobs)
      .values({ userId, kind, status: "queued" })
      .returning();
    // TODO Phase 4: enqueue BullMQ job here
    return reply.status(202).send({ job });
  });

  app.get("/:id", importRateLimitConfig, async (req, reply) => {
    const userId = await requireUser(req);
    const { id } = req.params as { id: string };
    const [job] = await db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.id, id))
      .limit(1);
    if (!job || job.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }
    return { job };
  });
};
