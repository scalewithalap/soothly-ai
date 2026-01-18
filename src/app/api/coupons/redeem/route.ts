/**
 * Coupon Redemption API
 *
 * POST: Redeem a validated coupon
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const redeemCouponSchema = z.object({
  couponId: z.string().uuid(),
  appliedTo: z.enum(["subscription", "credits"]),
  originalAmount: z.number().positive(),
  discountAmount: z.number().min(0),
  finalAmount: z.number().min(0),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { couponId, appliedTo, originalAmount, discountAmount, finalAmount } =
      redeemCouponSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Insert redemption record
    const { error: redemptionError } = await supabase
      .from("coupon_redemptions")
      .insert({
        coupon_id: couponId,
        org_id: authResult.orgId,
        user_id: authResult.id,
        applied_to: appliedTo,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
      });

    if (redemptionError) {
      console.error("Failed to record redemption:", redemptionError);
      return NextResponse.json(
        { error: "coupons/redemption_failed" },
        { status: 500 },
      );
    }

    // Increment usage count with direct update
    const { data: coupon } = await supabase
      .from("discount_coupons")
      .select("current_uses")
      .eq("id", couponId)
      .single();

    if (coupon) {
      await supabase
        .from("discount_coupons")
        .update({ current_uses: (coupon.current_uses || 0) + 1 })
        .eq("id", couponId);
    }

    // Audit log
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "create",
      entityType: "subscription",
      entityId: couponId,
      newValues: { appliedTo, discountAmount },
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
    console.error("Coupon redemption error:", error);
    return NextResponse.json(
      { error: "coupons/redemption_failed" },
      { status: 500 },
    );
  }
}

