/**
 * Rate Limiting with Upstash
 * Provides sliding window rate limiting for API routes
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./client";

export type RateLimitConfig = {
  /** Maximum number of requests */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Optional prefix for the rate limit key */
  prefix?: string;
};

/**
 * Create a rate limiter with sliding window algorithm
 */
export function createRateLimiter(config: RateLimitConfig): Ratelimit {
  const redis = getRedis();

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, `${config.window} s`),
    prefix: config.prefix || "ratelimit",
    analytics: true,
  });
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** Standard API: 100 requests per minute */
  api: () =>
    createRateLimiter({
      limit: 100,
      window: 60,
      prefix: "api",
    }),

  /** AI endpoints: 20 requests per minute */
  ai: () =>
    createRateLimiter({
      limit: 20,
      window: 60,
      prefix: "ai",
    }),

  /** Auth endpoints: 10 requests per minute */
  auth: () =>
    createRateLimiter({
      limit: 10,
      window: 60,
      prefix: "auth",
    }),

  /** Webhook endpoints: 50 requests per minute */
  webhook: () =>
    createRateLimiter({
      limit: 50,
      window: 60,
      prefix: "webhook",
    }),
};

/**
 * Check rate limit and return result
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
