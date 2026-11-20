import { Redis } from "ioredis";

let redisClient: Redis | null = null;

/**
 * Returns a singleton Redis client when REDIS_URL is configured.
 */
export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redisClient) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 2,
    });

    client.on("error", (err) => {
      console.error("[redis] Connection error:", err.message);
    });

    redisClient = client;
  }

  return redisClient;
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
