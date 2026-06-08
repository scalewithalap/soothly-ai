/**
 * Webhooks Management
 *
 * GET: List webhooks
 * POST: Create new webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createWebhook, listWebhooks, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

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

  const webhooks = await listWebhooks(authResult.orgId);

  return NextResponse.json({ webhooks, availableEvents: WEBHOOK_EVENTS });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

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

  try {
    const body = await request.json();
    const { name, url, events } = createWebhookSchema.parse(body);

    const result = await createWebhook({
      orgId: authResult.orgId,
      name,
      url,
      events,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "webhooks/create_failed" },
        { status: 500 },
      );
    }

    // Audit log
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "create",
      entityType: "organization",
      entityId: result.id,
      newValues: { name, url, events },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      secret: result.secret, // Only returned on creation
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Webhook creation error:", error);
    return NextResponse.json(
      { error: "webhooks/create_failed" },
      { status: 500 },
    );
  }
}

