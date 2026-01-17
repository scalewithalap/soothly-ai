/**
 * API Rate Limiter
 *
 * Provides API-wide rate limiting with configurable limits per endpoint group.
 * Uses Supabase for distributed rate limit tracking.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Rate limit configuration per endpoint group
export const RATE_LIMITS = {
  general: { maxRequests: 100, windowSeconds: 60 },
  agents: { maxRequests: 50, windowSeconds: 60 },
  uploads: { maxRequests: 20, windowSeconds: 60 },
  auth: { maxRequests: 10, windowSeconds: 60 },
  billing: { maxRequests: 30, windowSeconds: 60 },
  superagent: { maxRequests: 20, windowSeconds: 60 },
} as const;

export type EndpointGroup = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reset_at: string;
}

interface RateLimitCheckOptions {
  identifierType: "user" | "org" | "ip" | "api_key";
  identifier: string;
  endpointGroup?: EndpointGroup;
}

/**
 * Check rate limit using Supabase RPC
 */
export async function checkRateLimit(
  options: RateLimitCheckOptions,
): Promise<RateLimitResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const endpointGroup = options.endpointGroup || "general";
  const limits = RATE_LIMITS[endpointGroup];

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_identifier_type: options.identifierType,
    p_identifier: options.identifier,
    p_endpoint_group: endpointGroup,
    p_max_requests: limits.maxRequests,
    p_window_seconds: limits.windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      current: 0,
      limit: limits.maxRequests,
      remaining: limits.maxRequests,
      reset_at: new Date(
        Date.now() + limits.windowSeconds * 1000,
      ).toISOString(),
    };
  }

  return data as RateLimitResult;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.reset_at);
  return headers;
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = createRateLimitHeaders(result);

  return new NextResponse(
    JSON.stringify({
      error: "rate_limit/exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: result.reset_at,
    }),
    {
      status: 429,
      headers: {
        ...Object.fromEntries(headers.entries()),
        "Content-Type": "application/json",
        "Retry-After": Math.ceil(
          (new Date(result.reset_at).getTime() - Date.now()) / 1000,
        ).toString(),
      },
    },
  );
}

/**
 * Determine endpoint group from request path
 */
export function getEndpointGroup(pathname: string): EndpointGroup {
  if (pathname.startsWith("/api/agents")) return "agents";
  if (pathname.startsWith("/api/superagent")) return "superagent";
  if (pathname.startsWith("/api/uploads")) return "uploads";
  if (pathname.startsWith("/api/auth")) return "auth";
  if (pathname.startsWith("/api/billing") || pathname.startsWith("/api/polar"))
    return "billing";
  return "general";
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

const rateLimiter = {
  checkRateLimit,
  createRateLimitHeaders,
  createRateLimitResponse,
  getEndpointGroup,
  getClientIP,
  RATE_LIMITS,
};

export default rateLimiter;
