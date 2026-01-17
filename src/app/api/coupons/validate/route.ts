/**
 * Coupon Validation API
 *
 * POST: Validate a coupon code
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  applyTo: z.enum(["subscription", "credits"]),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { code, applyTo, amount } = validateCouponSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: code,
      p_user_id: authResult.id,
      p_apply_to: applyTo,
      p_amount: amount,
    });

    if (error) {
      console.error("Coupon validation error:", error);
      return NextResponse.json(
        { error: "coupons/validation_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "coupons/validation_failed" },
      { status: 500 },
    );
  }
}
