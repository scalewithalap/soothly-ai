import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication (protected)
const protectedRoutes = ["/dashboard", "/settings", "/agents", "/billing"];

// Routes that are public auth pages (redirect logged-in users away)
const authRoutes = ["/login", "/signup", "/forgot-password"];

// Rate limit configuration per endpoint group
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  agents: { maxRequests: 50, windowMs: 60000 },
  uploads: { maxRequests: 20, windowMs: 60000 },
  auth: { maxRequests: 10, windowMs: 60000 },
  billing: { maxRequests: 30, windowMs: 60000 },
  superagent: { maxRequests: 20, windowMs: 60000 },
  general: { maxRequests: 100, windowMs: 60000 },
};

// In-memory rate limit store — FALLBACK ONLY (per-instance, resets on
// restart; ineffective across serverless instances). Primary store is
// Upstash Redis via REST (fixed-window) when UPSTASH_REDIS_REST_* are set.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Distributed fixed-window rate limit via Upstash Redis REST pipeline
 * (INCR + PEXPIRE NX). Edge-safe: plain fetch, no SDK. Returns null when
 * Redis is not configured or errors (caller falls back to in-memory).
 */
async function checkRateLimitRedis(
  ip: string,
  endpoint: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.general;
  const window = Math.floor(Date.now() / limits.windowMs);
  const key = `rl:${endpoint}:${ip}:${window}`;
  const resetAt = (window + 1) * limits.windowMs;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(limits.windowMs), "NX"],
      ]),
      // Never let rate limiting add meaningful latency.
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ result?: number }>;
    const count = Number(results?.[0]?.result ?? 0);
    if (!count) return null;
    return {
      allowed: count <= limits.maxRequests,
      remaining: Math.max(0, limits.maxRequests - count),
      resetAt,
    };
  } catch {
    return null; // Redis unreachable — fall back to in-memory
  }
}

function getEndpointGroup(pathname: string): string {
  if (pathname.startsWith("/api/agents")) return "agents";
  if (pathname.startsWith("/api/superagent")) return "superagent";
  if (pathname.startsWith("/api/uploads")) return "uploads";
  if (pathname.startsWith("/api/auth")) return "auth";
  if (pathname.startsWith("/api/billing") || pathname.startsWith("/api/polar"))
    return "billing";
  return "general";
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimitInMemory(
  ip: string,
  endpoint: string,
): { allowed: boolean; remaining: number; resetAt: number } {
  const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.general;
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limits.windowMs });
    return {
      allowed: true,
      remaining: limits.maxRequests - 1,
      resetAt: now + limits.windowMs,
    };
  }

  record.count++;
  const remaining = Math.max(0, limits.maxRequests - record.count);
  const allowed = record.count <= limits.maxRequests;

  return { allowed, remaining, resetAt: record.resetAt };
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting to API routes (Redis-backed when configured,
  // per-instance in-memory fallback otherwise)
  if (pathname.startsWith("/api/")) {
    const ip = getClientIP(request);
    const endpoint = getEndpointGroup(pathname);
    const rateLimit =
      (await checkRateLimitRedis(ip, endpoint)) ??
      checkRateLimitInMemory(ip, endpoint);

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "rate_limit/exceeded",
          message: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
            "Retry-After": Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages to dashboard
  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    const redirect = url.searchParams.get("redirect") || "/dashboard";
    url.pathname = redirect;
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

