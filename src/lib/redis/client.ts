/**
 * Upstash Redis Client
 * HTTP-based Redis for serverless environments
 */

import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

/**
 * Get the Redis client singleton
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables"
      );
    }

    redisInstance = new Redis({
      url,
      token,
    });
  }

  return redisInstance;
}

/**
 * Cache helper with automatic expiration
 */
export async function cache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const redis = getRedis();
  const cached = await redis.get<T>(key);

  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  await redis.set(key, result, { ex: ttlSeconds });

  return result;
}

/**
 * Invalidate cache by key or pattern
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  const redis = getRedis();

  if (keyOrPattern.includes("*")) {
    // Pattern-based invalidation
    const keys = await redis.keys(keyOrPattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } else {
    await redis.del(keyOrPattern);
  }
}
