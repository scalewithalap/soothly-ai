/**
 * Webhook Deliveries API
 *
 * GET: List deliveries for a webhook
 * POST: Manually retry a failed delivery
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import {
  getWebhookDeliveries,
  retryWebhookDelivery,
  getWebhookStats,
} from "@/lib/webhooks";
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

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "webhooks/unauthorized" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const limit = parseInt(
    new URL(request.url).searchParams.get("limit") || "50",
    10,
  );

  const [deliveries, stats] = await Promise.all([
    getWebhookDeliveries(id, authResult.orgId, limit),
    getWebhookStats(id, authResult.orgId),
  ]);

  return NextResponse.json({ deliveries, stats });
}

export async function POST(
  request: NextRequest,
  {}: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "webhooks/unauthorized" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { error: "validation/missing_delivery_id" },
        { status: 400 },
      );
    }

    const result = await retryWebhookDelivery(deliveryId, authResult.orgId);

    if (!result.success) {
      return NextResponse.json(
        { error: `webhooks/${result.error || "retry_failed"}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook retry error:", error);
    return NextResponse.json(
      { error: "webhooks/retry_failed" },
      { status: 500 },
    );
  }
}
