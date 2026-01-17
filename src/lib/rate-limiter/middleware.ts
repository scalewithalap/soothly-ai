/**
 * Rate Limit Middleware
 *
 * Apply rate limiting to API routes based on user/org/IP.
 * Uses the rate-limiter module for distributed tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  createRateLimitHeaders,
  createRateLimitResponse,
  getEndpointGroup,
  getClientIP,
  type EndpointGroup,
} from "@/lib/rate-limiter";
import { createClient } from "@/lib/supabase/server";

interface RateLimitMiddlewareOptions {
  endpointGroup?: EndpointGroup;
  skipAuth?: boolean;
}

/**
 * Apply rate limiting middleware to a request
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimited = await applyRateLimit(request);
 *   if (rateLimited) return rateLimited;
 *   // ... handle request
 * }
 * ```
 */
export async function applyRateLimit(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {},
): Promise<NextResponse | null> {
  const pathname = new URL(request.url).pathname;
  const endpointGroup = options.endpointGroup || getEndpointGroup(pathname);

  // Try to get user/org from session first
  let identifierType: "user" | "org" | "ip" = "ip";
  let identifier = getClientIP(request);

  if (!options.skipAuth) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Get org_id for authenticated users
        const { data: userData } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (userData?.org_id) {
          identifierType = "org";
          identifier = userData.org_id;
        } else {
          identifierType = "user";
          identifier = user.id;
        }
      }
    } catch {
      // Fall back to IP-based limiting
    }
  }

  const result = await checkRateLimit({
    identifierType,
    identifier,
    endpointGroup,
  });

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  // Return null to indicate request is allowed
  // Caller should add rate limit headers to their response
  return null;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit<
  T extends (...args: unknown[]) => Promise<NextResponse>,
>(handler: T, options: RateLimitMiddlewareOptions = {}): T {
  return (async (...args: unknown[]) => {
    const request = args[0] as NextRequest;
    const rateLimited = await applyRateLimit(request, options);
    if (rateLimited) return rateLimited;

    const response = await handler(...args);

    // Add rate limit headers to successful response
    const pathname = new URL(request.url).pathname;
    const endpointGroup = options.endpointGroup || getEndpointGroup(pathname);
    const result = await checkRateLimit({
      identifierType: "ip",
      identifier: getClientIP(request),
      endpointGroup,
    });

    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  }) as T;
}

export {
  checkRateLimit,
  createRateLimitHeaders,
  getEndpointGroup,
  getClientIP,
};
