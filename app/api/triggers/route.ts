/**
 * Webhook Triggers API
 *
 * POST: Execute an incoming webhook trigger from Zapier/Make
 * GET: List available triggers with documentation
 *
 * Authentication: API Key via X-API-Key header
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import {
  executeWebhookTrigger,
  WEBHOOK_TRIGGERS,
  TRIGGER_DESCRIPTIONS,
  getTriggerDocumentation,
  type WebhookTrigger,
} from "@/lib/webhooks/triggers";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

// Rate limiting: Simple in-memory counter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(orgId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(orgId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

const triggerSchema = z.object({
  action: z.enum(WEBHOOK_TRIGGERS),
  payload: z.record(z.string(), z.unknown()),
});

/**
 * Authenticate request via API key
 */
async function authenticateApiKey(
  apiKey: string,
): Promise<{ valid: boolean; orgId?: string; userId?: string }> {
  if (!apiKey || !apiKey.startsWith("zh_")) {
    return { valid: false };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Look up API key
  const { data: apiKeyRecord } = await supabase
    .from("api_keys")
    .select("id, org_id, user_id, is_active")
    .eq("key_hash", hashApiKey(apiKey))
    .single();

  if (!apiKeyRecord || !apiKeyRecord.is_active) {
    return { valid: false };
  }

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRecord.id);

  return {
    valid: true,
    orgId: apiKeyRecord.org_id,
    userId: apiKeyRecord.user_id,
  };
}

function hashApiKey(apiKey: string): string {
  // Simple hash for lookup (in production, use bcrypt or similar)
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * GET: List available triggers with documentation
 */
export async function GET() {
  return NextResponse.json({
    triggers: WEBHOOK_TRIGGERS,
    descriptions: TRIGGER_DESCRIPTIONS,
    documentation: getTriggerDocumentation(),
  });
}

/**
 * POST: Execute a trigger action
 */
export async function POST(request: NextRequest) {
  // Get API key from header
  const apiKey = request.headers.get("X-API-Key") || "";

  // Authenticate
  const auth = await authenticateApiKey(apiKey);
  if (!auth.valid || !auth.orgId) {
    return NextResponse.json(
      { error: "Invalid or missing API key", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // Rate limit
  if (!checkRateLimit(auth.orgId)) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  // Parse request
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  // Validate schema
  const parseResult = triggerSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request format",
        code: "VALIDATION_ERROR",
        details: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const { action, payload } = parseResult.data;

  // Execute trigger
  const result = await executeWebhookTrigger(
    auth.orgId,
    action as WebhookTrigger,
    payload,
  );

  // Audit log
  const { ipAddress, userAgent } = getRequestContext(request);
  await logAuditEvent({
    orgId: auth.orgId,
    userId: auth.userId || null,
    action: "trigger_executed",
    entityType: "webhook_trigger",
    entityId: action,
    metadata: {
      success: result.success,
      errorCode: result.errorCode,
      payloadKeys: Object.keys(payload),
    },
    ipAddress,
    userAgent,
  });

  if (!result.success) {
    const statusCode = result.errorCode === "VALIDATION_ERROR" ? 400 : 422;
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        code: result.errorCode,
        data: result.data,
      },
      { status: statusCode },
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}
