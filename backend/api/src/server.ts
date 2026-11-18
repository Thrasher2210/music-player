import { toNodeHandler } from "better-auth/node";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { fileURLToPath } from "node:url";
import { auth, trustedOrigins } from "./auth.js";
import { playlistsRoutes } from "./routes/playlists.js";
import { likesRoutes } from "./routes/likes.js";
import { historyRoutes } from "./routes/history.js";
import { lyricsRoutes } from "./routes/lyrics.js";
import { importRoutes } from "./routes/import.js";

export async function buildServer(opts?: { logger?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts?.logger ?? (process.env.NODE_ENV === "test" ? false : true),
    trustProxy: true,
  });

  await app.register(cors, {
    origin: trustedOrigins,
    credentials: true,
  });

  await app.register(cookie);

  // Better Auth mounts all of /api/auth/*. Handled in onRequest so Fastify's
  // body parser never consumes the stream — Better Auth parses it itself.
  app.addHook("onRequest", (req, reply, done) => {
    const url = req.raw.url?.split("?")[0];
    if (url === "/api/auth" || url?.startsWith("/api/auth/")) {
      void reply.hijack();
      toNodeHandler(auth)(req.raw, reply.raw);
      return;
    }
    done();
  });

  app.get("/healthz", async () => ({ ok: true, ts: Date.now() }));

  await app.register(playlistsRoutes, { prefix: "/api/playlists" });
  await app.register(likesRoutes, { prefix: "/api/likes" });
  await app.register(historyRoutes, { prefix: "/api/history" });
  await app.register(lyricsRoutes, { prefix: "/api/lyrics" });
  await app.register(importRoutes, { prefix: "/api/import" });

  return app;
}

// Only start the server when run directly (e.g. tsx src/server.ts)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("/server.ts") ||
    process.argv[1].endsWith("/server.js") ||
    (import.meta.url && fileURLToPath(import.meta.url) === process.argv[1]));

if (isMain) {
  void (async () => {
    const app = await buildServer();
    const port = Number(process.env.PORT ?? 4000);
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`api listening on :${port}`);
  })();
}
