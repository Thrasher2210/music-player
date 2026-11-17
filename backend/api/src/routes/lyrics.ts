import type { FastifyPluginAsync } from "fastify";
import { lyricsResponseSchema } from "@mp/api-contract";
import { createCache } from "../cache.js";

const cache = createCache();
const TTL = 60 * 60 * 24; // lyrics rarely change — 24 h

// Phase 5: multi-provider lyrics (LRCLIB first). Placeholder returns a
// well-formed empty response so the contract is testable.
export const lyricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req, reply) => {
    const { videoId } = req.query as { videoId?: string };
    if (!videoId) {
      return reply.status(400).send({ error: "videoId_required" });
    }

    const key = `lyrics:${videoId}`;
    const hit = await cache.get(key);
    if (hit) {
      return reply
        .header("content-type", "application/json")
        .send(JSON.parse(hit));
    }

    const payload = lyricsResponseSchema.parse({
      videoId,
      synced: false,
      lines: [],
      source: "none",
    });
    await cache.set(key, JSON.stringify(payload), TTL);
    return payload;
  });
};
