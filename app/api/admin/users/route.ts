/**
 * Admin Users API
 *
 * List and manage users in the organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]).optional(),
});

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, created_at, last_sign_in_at")
    .eq("org_id", authResult.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "admin/users_fetch_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ users: users || [] });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role } = updateUserSchema.parse(body);

    // Get old values for audit
    const { data: oldUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .eq("org_id", authResult.orgId)
      .single();

    if (!oldUser) {
      return NextResponse.json(
        { error: "admin/user_not_found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId)
      .eq("org_id", authResult.orgId);

    if (error) {
      return NextResponse.json(
        { error: "admin/update_failed" },
        { status: 500 },
      );
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "update",
      entityType: "user",
      entityId: userId,
      oldValues: { role: oldUser.role },
      newValues: { role },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "admin/update_failed" }, { status: 500 });
  }
}

