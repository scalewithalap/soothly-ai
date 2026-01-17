/**
 * Webhook Management by ID
 *
 * DELETE: Delete webhook
 * PATCH: Update webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

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

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id)
    .eq("org_id", authResult.orgId);

  if (error) {
    return NextResponse.json(
      { error: "webhooks/delete_failed" },
      { status: 500 },
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await logAuditEvent({
    orgId: authResult.orgId,
    userId: authResult.id,
    action: "delete",
    entityType: "organization",
    entityId: id,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

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

  try {
    const body = await request.json();
    const { name, url, events, isActive } = updateWebhookSchema.parse(body);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { error } = await supabase
      .from("webhooks")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", authResult.orgId);

    if (error) {
      return NextResponse.json(
        { error: "webhooks/update_failed" },
        { status: 500 },
      );
    }

    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "update",
      entityType: "organization",
      entityId: id,
      newValues: updateData,
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
    console.error("Webhook update error:", error);
    return NextResponse.json(
      { error: "webhooks/update_failed" },
      { status: 500 },
    );
  }
}
