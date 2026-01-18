/**
 * Affiliate Conversion Webhook API
 * Receives conversion events from payment providers (Polar, Stripe, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackConversion } from "@/lib/affiliates/conversion";
import { createClient } from "@supabase/supabase-js";

type AnyClient = any;

// Webhook payload schema
const conversionWebhookSchema = z.object({
  type: z.enum(["order.completed", "subscription.created", "payment.success"]),
  data: z.object({
    user_id: z.string().optional(),
    user_email: z.string().email().optional(),
    order_id: z.string(),
    amount: z.number(),
    currency: z.string().default("USD"),
    referral_code: z.string().optional(),
  }),
});

// Internal API for triggering conversions from the app
const internalConversionSchema = z.object({
  userId: z.string().uuid(),
  orderId: z.string(),
  amount: z.number().min(0),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is an internal request or webhook
    const authHeader = request.headers.get("authorization");
    const isInternal = authHeader?.startsWith("Bearer ");

    if (isInternal) {
      // Internal API call - validate internal schema
      const parsed = internalConversionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "validation/invalid_input", details: parsed.error.issues },
          { status: 400 },
        );
      }

      const result = await trackConversion({
        userId: parsed.data.userId,
        orderId: parsed.data.orderId,
        orderAmount: parsed.data.amount,
        referralCode: parsed.data.referralCode,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } else {
      // Webhook call - validate webhook schema
      const parsed = conversionWebhookSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "validation/invalid_webhook_payload" },
          { status: 400 },
        );
      }

      // Need to find user_id from email if not provided
      let userId = parsed.data.data.user_id;
      if (!userId && parsed.data.data.user_email) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false },
        }) as AnyClient;

        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("email", parsed.data.data.user_email)
          .single();

        userId = user?.id;
      }

      if (!userId) {
        return NextResponse.json(
          { error: "user_not_found", message: "Could not identify user" },
          { status: 404 },
        );
      }

      const result = await trackConversion({
        userId,
        orderId: parsed.data.data.order_id,
        orderAmount: parsed.data.data.amount,
        referralCode: parsed.data.data.referral_code,
      });

      // Always return 200 for webhooks to prevent retries
      return NextResponse.json({
        received: true,
        processed: result.success,
        ...result,
      });
    }
  } catch (error) {
    console.error("Conversion webhook error:", error);
    return NextResponse.json(
      { error: "webhook/processing_failed" },
      { status: 500 },
    );
  }
}
