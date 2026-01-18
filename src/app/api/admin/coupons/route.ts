/**
 * Admin Coupons Management
 *
 * GET: List all coupons
 * POST: Create new coupon
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const createCouponSchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed", "credits"]),
  value: z.number().positive(),
  appliesTo: z.array(z.enum(["subscription", "credits"])).min(1),
  planIds: z.array(z.string()).optional(),
  maxUses: z.number().positive().optional(),
  maxUsesPerUser: z.number().positive().default(1),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  minPurchase: z.number().positive().optional(),
});

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (!["admin", "owner"].includes(user?.role || "")) {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  const { data: coupons, error } = await supabase
    .from("discount_coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "coupons/fetch_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ coupons: coupons || [] });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (!["admin", "owner"].includes(user?.role || "")) {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = createCouponSchema.parse(body);

    const { data, error } = await supabase
      .from("discount_coupons")
      .insert({
        code: validated.code.toUpperCase(),
        description: validated.description,
        type: validated.type,
        value: validated.value,
        applies_to: validated.appliesTo,
        plan_ids: validated.planIds,
        max_uses: validated.maxUses,
        max_uses_per_user: validated.maxUsesPerUser,
        valid_from: validated.validFrom,
        valid_until: validated.validUntil,
        min_purchase: validated.minPurchase,
        created_by: authResult.id,
      })
      .select("id, code")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "coupons/code_exists" },
          { status: 400 },
        );
      }
      console.error("Failed to create coupon:", error);
      return NextResponse.json(
        { error: "coupons/create_failed" },
        { status: 500 },
      );
    }

    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "create",
      entityType: "subscription",
      entityId: data.id,
      newValues: {
        code: data.code,
        type: validated.type,
        value: validated.value,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, coupon: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Coupon creation error:", error);
    return NextResponse.json(
      { error: "coupons/create_failed" },
      { status: 500 },
    );
  }
}

