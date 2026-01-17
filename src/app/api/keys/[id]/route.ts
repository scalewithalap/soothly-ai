/**
 * API Key Actions by ID
 *
 * DELETE: Revoke API key
 * POST: Rotate API key
 * GET: Get usage stats
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import {
  revokeApiKey,
  rotateApiKey,
  getApiKeyUsageStats,
} from "@/lib/api-keys";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

async function checkAdminRole(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return ["admin", "owner"].includes(user?.role || "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "api_keys/unauthorized" },
      { status: 403 },
    );
  }

  // Get usage stats
  const days = parseInt(
    new URL(request.url).searchParams.get("days") || "30",
    10,
  );
  const result = await getApiKeyUsageStats(authResult.orgId, id, days);

  if (!result.success) {
    return NextResponse.json(
      { error: "api_keys/stats_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    stats: result.stats,
    dailyUsage: result.daily_usage,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "api_keys/unauthorized" },
      { status: 403 },
    );
  }

  // Rotate the key
  const result = await rotateApiKey(authResult.orgId, id);

  if (!result.success) {
    return NextResponse.json(
      { error: "api_keys/rotate_failed" },
      { status: 500 },
    );
  }

  // Audit log
  const { ipAddress, userAgent } = getRequestContext(request);
  await logAuditEvent({
    orgId: authResult.orgId,
    userId: authResult.id,
    action: "update",
    entityType: "user",
    entityId: id,
    newValues: { action: "rotate" },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    key: result.key, // New key - only returned here
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "api_keys/unauthorized" },
      { status: 403 },
    );
  }

  const success = await revokeApiKey(authResult.orgId, id);

  if (!success) {
    return NextResponse.json(
      { error: "api_keys/revoke_failed" },
      { status: 500 },
    );
  }

  // Audit log
  const { ipAddress, userAgent } = getRequestContext(request);
  await logAuditEvent({
    orgId: authResult.orgId,
    userId: authResult.id,
    action: "delete",
    entityType: "user",
    entityId: id,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true });
}
