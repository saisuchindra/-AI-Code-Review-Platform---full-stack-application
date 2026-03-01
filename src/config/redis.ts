import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // required by BullMQ
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      reconnectOnError(err: Error) {
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
    });

    redis.on("connect", () => logger.info("✅ Redis connected"));
    redis.on("error", (err) => logger.error({ err }, "❌ Redis error"));
    redis.on("close", () => logger.warn("Redis connection closed"));
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    logger.info("Redis disconnected");
  }
}
