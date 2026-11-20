import type { FastifyPluginAsync } from "fastify";
import { lyricsResponseSchema } from "@mp/api-contract";
import { LyricsManager } from "../lyrics/index.js";
import { lyricsRateLimitConfig } from "../rateLimit.js";

const lyricsManager = new LyricsManager();

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

interface LyricsQueryParams {
  videoId?: string;
  title?: string;
  artist?: string;
  durationSec?: string | number;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const lyricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", lyricsRateLimitConfig, async (req, reply) => {
    const { videoId, title, artist, durationSec } = req.query as LyricsQueryParams;
    if (!videoId) {
      return reply.status(400).send({ error: "videoId_required" });
    }
    if (typeof videoId !== "string" || !YOUTUBE_VIDEO_ID.test(videoId)) {
      return reply.status(400).send({ error: "videoId_invalid" });
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
      title: optionalString(title),
      artist: optionalString(artist),
      durationSec: parsedDuration,
    });

    const payload = lyricsResponseSchema.parse(result);
    return payload;
  });
};
