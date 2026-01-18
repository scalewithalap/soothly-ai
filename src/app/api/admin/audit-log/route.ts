/**
 * Admin Audit Log API
 *
 * View audit log entries for the organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { getAuditLog } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check if user is admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const { entries, total } = await getAuditLog(authResult.orgId, {
      limit,
      offset,
    });

    return NextResponse.json({
      entries,
      total,
      hasMore: offset + entries.length < total,
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "admin/audit_log_failed" },
      { status: 500 },
    );
  }
}

