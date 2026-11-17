// Worker: BullMQ jobs (Spotify import in Phase 4).
// Requires REDIS_URL — BullMQ is Redis-backed and there is no honest
// in-memory substitute. If Redis isn't configured the worker exits with a
// clear message instead of silently doing nothing.
async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn(
      "[worker] REDIS_URL not set — nothing to do. Import jobs need Redis\n" +
        "         (docker compose up redis, or any hosted Redis). Exiting.",
    );
    process.exit(0);
  }

  const { Worker } = await import("bullmq");

  const connection = { url: redisUrl };

  const importWorker = new Worker(
    "spotify-import",
    async (job) => {
      console.log(`[spotify-import] job ${job.id} — pipeline not implemented yet`);
      return { ok: true };
    },
    { connection, concurrency: 4 },
  );

  importWorker.on("failed", (job, err) => {
    console.error(`[spotify-import] job ${job?.id} failed:`, err.message);
  });

  console.log("worker running: spotify-import");
}

void main();
