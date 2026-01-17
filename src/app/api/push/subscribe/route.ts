/**
 * Push Subscription API
 *
 * POST: Subscribe to push notifications
 * DELETE: Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { getVapidPublicKey } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * GET - Return VAPID public key for client
 */
export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json({ error: "push/not_configured" }, { status: 503 });
  }

  return NextResponse.json({ publicKey });
}

/**
 * POST - Save push subscription
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const subscription = subscriptionSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get user's org_id
    const { data: user } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", authResult.id)
      .single();

    if (!user?.org_id) {
      return NextResponse.json(
        { error: "auth/no_organization" },
        { status: 403 },
      );
    }

    // Upsert push subscription to notification_settings
    const { error } = await supabase.from("notification_settings").upsert(
      {
        user_id: authResult.id,
        org_id: user.org_id,
        push_subscription: subscription,
        push_enabled: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      console.error("Failed to save push subscription:", error);
      return NextResponse.json({ error: "push/save_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_subscription" },
        { status: 400 },
      );
    }
    throw err;
  }
}

/**
 * DELETE - Remove push subscription
 */
export async function DELETE() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("notification_settings")
    .update({
      push_subscription: null,
      push_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", authResult.id);

  if (error) {
    console.error("Failed to remove push subscription:", error);
    return NextResponse.json({ error: "push/remove_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
