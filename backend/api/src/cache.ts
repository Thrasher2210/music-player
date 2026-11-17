import { Redis } from "ioredis";

/**
 * Cache abstraction: Redis when REDIS_URL is set, in-memory LRU otherwise.
 * Keeps local dev zero-infra and prod identical from the caller's view.
 */
type Entry = { value: string; expiresAt: number };

const mem = new Map<string, Entry>();
const MEM_MAX = 1000;

function memGet(key: string): string | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value;
}

function memSet(key: string, value: string, ttlSeconds: number) {
  if (mem.size >= MEM_MAX && !mem.has(key)) {
    // drop oldest inserted key
    const oldest = mem.keys().next().value;
    if (oldest !== undefined) mem.delete(oldest);
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export function createCache(): Cache {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[cache] REDIS_URL not set — using in-memory cache (dev mode)");
    return {
      get: async (key) => memGet(key),
      set: async (key, value, ttl) => memSet(key, value, ttl),
    };
  }

  const redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
  void redis.connect().catch((err) => {
    console.error("[cache] Redis connect failed, falling back to memory:", err.message);
  });
  redis.on("error", () => {
    /* handled via fallback below */
  });

  return {
    get: async (key) => {
      try {
        if (redis.status !== "ready") return memGet(key);
        return await redis.get(key);
      } catch {
        return memGet(key);
      }
    },
    set: async (key, value, ttl) => {
      memSet(key, value, ttl);
      try {
        if (redis.status === "ready") await redis.set(key, value, "EX", ttl);
      } catch {
        /* memory copy already saved us */
      }
    },
  };
}
