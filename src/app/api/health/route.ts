/**
 * Health Check Endpoint
 *
 * Returns system health status for uptime monitoring.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: "up" | "down" | "degraded";
  latency?: number;
  message?: string;
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    redis: { status: "down" },
    memory: { status: "down" },
  };

  // Check database
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const dbStart = Date.now();
    const { error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.database = {
        status: "down",
        latency: dbLatency,
        message: error.message,
      };
    } else {
      checks.database = {
        status: dbLatency > 1000 ? "degraded" : "up",
        latency: dbLatency,
      };
    }
  } catch (err) {
    checks.database = {
      status: "down",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check Redis
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const redisStart = Date.now();
      await redis.ping();
      const redisLatency = Date.now() - redisStart;

      checks.redis = {
        status: redisLatency > 500 ? "degraded" : "up",
        latency: redisLatency,
      };
    } else {
      checks.redis = {
        status: "degraded",
        message: "Redis not configured",
      };
    }
  } catch (err) {
    checks.redis = {
      status: "down",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check memory
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round(
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    );

    checks.memory = {
      status: usagePercent > 90 ? "degraded" : "up",
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    };
  } catch {
    checks.memory = { status: "down", message: "Unable to read memory" };
  }

  // Determine overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overallStatus: HealthStatus["status"] = "healthy";

  if (statuses.includes("down")) {
    overallStatus = "unhealthy";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks,
  };

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
