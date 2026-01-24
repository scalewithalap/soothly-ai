/**
 * Webhook Test Endpoint
 *
 * POST: Send a test webhook to verify configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { testWebhook } from "@/lib/webhooks";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

  // Check admin role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (!["admin", "owner"].includes(user?.role || "")) {
    return NextResponse.json(
      { error: "webhooks/unauthorized" },
      { status: 403 },
    );
  }

  const result = await testWebhook(id, authResult.orgId);

  // Audit log
  const { ipAddress, userAgent } = getRequestContext(request);
  await logAuditEvent({
    orgId: authResult.orgId,
    userId: authResult.id,
    action: "webhook_test",
    entityType: "webhook",
    entityId: id,
    metadata: {
      success: result.success,
      responseStatus: result.responseStatus,
    },
    ipAddress,
    userAgent,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        responseStatus: result.responseStatus,
        responseTime: result.responseTime,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    success: true,
    responseStatus: result.responseStatus,
    responseTime: result.responseTime,
  });
}
