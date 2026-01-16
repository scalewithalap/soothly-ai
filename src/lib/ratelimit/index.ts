import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Upstash Redis client for rate limiting.
 * Configure via UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Rate limiter configurations for different API tiers.
 * Sliding window algorithm for smooth rate limiting.
 */

// Public APIs (no auth required) - strict limits
export const publicRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
  prefix: "@ratelimit:public",
});

// Authenticated APIs - moderate limits
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute
  analytics: true,
  prefix: "@ratelimit:auth",
});

// Premium tier APIs - generous limits
export const premiumRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 m"), // 200 requests per minute
  analytics: true,
  prefix: "@ratelimit:premium",
});

// Agent execution APIs - limited to prevent abuse
export const agentRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 agent executions per minute
  analytics: true,
  prefix: "@ratelimit:agent",
});

// Auth endpoints (login, signup) - strict to prevent brute force
export const authEndpointRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 attempts per minute
  analytics: true,
  prefix: "@ratelimit:auth-endpoint",
});

/**
 * Helper to check rate limit and return appropriate response.
 * @param identifier - Unique identifier (IP, user ID, org ID)
 * @param limiter - Rate limiter instance to use
 * @returns null if allowed, NextResponse if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<NextResponse | null> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(
      identifier
    );

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limit/exceeded",
            message: "Too many requests. Please try again later.",
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null; // Request allowed
  } catch (error) {
    // If Redis is unavailable, allow request but log the error
    console.error("Rate limit check failed:", error);
    return null;
  }
}

/**
 * Get client IP from request headers.
 * Works with Next.js, Vercel, and other platforms.
 */
export function getClientIP(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (xff) {
    return xff.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * Rate limit middleware wrapper for API routes.
 * Usage: export const GET = withRateLimit(authRateLimiter, async (req) => { ... })
 */
export function withRateLimit<T extends Request>(
  limiter: Ratelimit,
  handler: (request: T) => Promise<Response>,
  getIdentifier?: (request: T) => string
) {
  return async (request: T): Promise<Response> => {
    const identifier = getIdentifier
      ? getIdentifier(request)
      : getClientIP(request);

    const rateLimitResponse = await checkRateLimit(identifier, limiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request);
  };
}

// Export Redis client for other use cases (caching, etc.)
export { redis };
