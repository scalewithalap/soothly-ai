/**
 * Affiliate Stats API
 * Returns detailed affiliate statistics including tier info and leaderboard position
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAffiliateTier,
  getAffiliateLeaderboard,
} from "@/lib/affiliates/tiers";
import { getConversionAnalytics } from "@/lib/affiliates/conversion";

type AnyClient = any;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "auth/unauthorized" } },
        { status: 401 },
      );
    }

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: { code: "org/not_found" } },
        { status: 404 },
      );
    }

    const affiliateClient = supabase as AnyClient;

    // Get affiliate record
    const { data: affiliate, error } = await affiliateClient
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !affiliate) {
      return NextResponse.json(
        { error: { code: "affiliate/not_found" } },
        { status: 404 },
      );
    }

    // Calculate tier info
    const tierInfo = calculateAffiliateTier(
      affiliate.total_conversions,
      affiliate.total_earned,
    );

    // Get conversion analytics
    const analytics = await getConversionAnalytics(affiliate.id);

    // Get leaderboard to find rank
    const leaderboard = await getAffiliateLeaderboard(userData.org_id, 100);
    const rank =
      leaderboard.findIndex((l) => l.affiliateId === affiliate.id) + 1;

    // Build response
    const stats = {
      affiliate: {
        id: affiliate.id,
        referral_code: affiliate.referral_code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
        payment_method: affiliate.payment_method,
        created_at: affiliate.created_at,
        approved_at: affiliate.approved_at,
      },
      totals: {
        referrals: affiliate.total_referrals,
        conversions: affiliate.total_conversions,
        earned: affiliate.total_earned,
        paid: affiliate.total_paid,
        pending: affiliate.pending_balance,
      },
      tier: tierInfo,
      analytics: {
        conversionRate: analytics.conversionRate,
        totalRevenue: analytics.totalRevenue,
        recentConversions: analytics.recentConversions.slice(0, 5),
      },
      leaderboard: {
        rank: rank || null,
        totalAffiliates: leaderboard.length,
        topAffiliates: leaderboard.slice(0, 5),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Affiliate stats API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}
