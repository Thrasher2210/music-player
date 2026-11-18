import type { FastifyPluginAsync } from "fastify";
import { lyricsResponseSchema } from "@mp/api-contract";
import { LyricsManager } from "../lyrics/index.js";

const lyricsManager = new LyricsManager();

interface LyricsQueryParams {
  videoId?: string;
  title?: string;
  artist?: string;
  durationSec?: string | number;
}

export const lyricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req, reply) => {
    const { videoId, title, artist, durationSec } = req.query as LyricsQueryParams;
    if (!videoId) {
      return reply.status(400).send({ error: "videoId_required" });
    }

    let parsedDuration: number | undefined;
    if (durationSec !== undefined) {
      const num = Number(durationSec);
      if (!isNaN(num) && num > 0) {
        parsedDuration = num;
      }
    }

    const result = await lyricsManager.getLyrics({
      videoId,
      title,
      artist,
      durationSec: parsedDuration,
    });

    const payload = lyricsResponseSchema.parse(result);
    return payload;
  });
};
