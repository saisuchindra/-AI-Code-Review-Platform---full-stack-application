import { getRedis } from "../config/redis";
import { logger } from "./logger";

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Redis-backed cache utility for storing analysis results and other data.
 */
export const cache = {
  /**
   * Get a cached value by key. Returns null on miss.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const value = await redis.get(prefixKey(key));
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ key, error }, "Cache get failed");
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL (seconds).
   */
  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    try {
      const redis = getRedis();
      const serialized = JSON.stringify(value);
      await redis.set(prefixKey(key), serialized, "EX", ttlSeconds);
    } catch (error) {
      logger.warn({ key, error }, "Cache set failed");
    }
  },

  /**
   * Delete a specific cache key.
   */
  async del(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(prefixKey(key));
    } catch (error) {
      logger.warn({ key, error }, "Cache del failed");
    }
  },

  /**
   * Delete all keys matching a pattern (e.g., "analysis:user123:*").
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const redis = getRedis();
      let cursor = "0";
      let deleted = 0;
      const fullPattern = prefixKey(pattern);

      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", fullPattern, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== "0");

      return deleted;
    } catch (error) {
      logger.warn({ pattern, error }, "Cache delPattern failed");
      return 0;
    }
  },

  /**
   * Check if a key exists in cache.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const redis = getRedis();
      const result = await redis.exists(prefixKey(key));
      return result === 1;
    } catch {
      return false;
    }
  },
};

/**
 * Add a token to the blacklist (for logout, revocation).
 */
export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(`acr:blacklist:${token}`, "1", "EX", ttlSeconds);
  } catch (error) {
    logger.error({ error }, "Failed to blacklist token");
  }
}

/**
 * Check if a token is blacklisted.
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.exists(`acr:blacklist:${token}`);
    return result === 1;
  } catch {
    return false;
  }
}

function prefixKey(key: string): string {
  return `acr:${key}`;
}
