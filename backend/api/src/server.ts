import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { auth } from "./auth.js";
import { playlistsRoutes } from "./routes/playlists.js";
import { likesRoutes } from "./routes/likes.js";
import { lyricsRoutes } from "./routes/lyrics.js";
import { importRoutes } from "./routes/import.js";

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(cors, {
  origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(","),
  credentials: true,
});

// Better Auth mounts all of /api/auth/*. Handled in onRequest so Fastify's
// body parser never consumes the stream — Better Auth parses it itself.
app.addHook("onRequest", (req, reply, done) => {
  if (req.raw.url?.startsWith("/api/auth/")) {
    void reply.hijack();
    toNodeHandler(auth)(req.raw, reply.raw);
    return;
  }
  done();
});

app.get("/healthz", async () => ({ ok: true, ts: Date.now() }));

await app.register(playlistsRoutes, { prefix: "/api/playlists" });
await app.register(likesRoutes, { prefix: "/api/likes" });
await app.register(lyricsRoutes, { prefix: "/api/lyrics" });
await app.register(importRoutes, { prefix: "/api/import" });

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(`api listening on :${port}`);
