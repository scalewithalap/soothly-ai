/**
 * API Key Management by ID
 *
 * DELETE: Revoke API key
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-keys";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
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
