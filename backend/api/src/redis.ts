import { Redis } from "ioredis";

let redisClient: Redis | null = null;

/**
 * Returns a singleton Redis client when REDIS_URL is configured.
 */
export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redisClient) {
    // Commands must fail immediately while Redis is unreachable instead of
    // queueing until the retries run out. Callers fall back (rate limiter
    // skips, cache uses memory) so an outage is not felt by API requests.
    const client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });

    client.on("error", (err) => {
      console.error("[redis] Connection error:", err.message);
    });

    redisClient = client;
  }

  return redisClient;
}

/**
 * Resolves once the client is connected, or after `timeoutMs` if it is not.
 * Without the offline queue, commands sent before the first connection is
 * ready are rejected, so startup waits briefly for it. Never rejects.
 */
export function waitForRedisReady(timeoutMs = 1000): Promise<void> {
  const client = redisClient;
  if (!client || client.status === "ready") return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      client.off("ready", finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    client.once("ready", finish);
  });
}

/**
 * Gracefully closes the Redis connection (called on Fastify shutdown).
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      if (redisClient.status === "ready" || redisClient.status === "connecting") {
        await redisClient.quit();
      } else {
        redisClient.disconnect();
      }
    } catch {
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}
