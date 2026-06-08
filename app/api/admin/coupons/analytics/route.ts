/**
 * Coupon Analytics API
 *
 * GET: Get aggregated coupon analytics
 */

import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
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

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "coupons/unauthorized" },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Get aggregated analytics
  const { data: redemptions, error: redemptionsError } = await supabase
    .from("coupon_redemptions")
    .select("discount_amount, created_at, coupon_id")
    .eq("org_id", authResult.orgId);

  if (redemptionsError) {
    console.error("Failed to fetch redemptions:", redemptionsError);
    return NextResponse.json(
      { error: "coupons/analytics_failed" },
      { status: 500 },
    );
  }

  // Get coupon usage counts
  const { data: coupons, error: couponsError } = await supabase
    .from("discount_coupons")
    .select("id, code, current_uses, type, value")
    .eq("created_by", authResult.id);

  if (couponsError) {
    console.error("Failed to fetch coupons:", couponsError);
    return NextResponse.json(
      { error: "coupons/analytics_failed" },
      { status: 500 },
    );
  }

  // Calculate summary stats
  const totalRedemptions = redemptions?.length || 0;
  const totalSaved =
    redemptions?.reduce(
      (sum, r) => sum + parseFloat(r.discount_amount || "0"),
      0,
    ) || 0;

  // Usage by coupon
  const couponStats = (coupons || []).map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    uses: coupon.current_uses,
    type: coupon.type,
    value: coupon.value,
  }));

  // Monthly trend (last 6 months)
  const monthlyTrend: Record<string, number> = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  (redemptions || []).forEach((r) => {
    const date = new Date(r.created_at);
    if (date >= sixMonthsAgo) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + 1;
    }
  });

  return NextResponse.json({
    summary: {
      totalRedemptions,
      totalSaved: Math.round(totalSaved * 100) / 100,
      activeCoupons: coupons?.length || 0,
    },
    couponStats,
    monthlyTrend: Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
  });
}

