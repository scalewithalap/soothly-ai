/**
 * Affiliate Conversion Tracking Service
 * Handles order attribution, conversion events, and commission generation
 */

import { createClient } from "@/lib/supabase/server";
import { recordCommission } from "./commission";
import { clearReferralCookie, getStoredReferralCode } from "./tracking";
import type { Affiliate, AffiliateReferral } from "./types";

type AnyClient = any;

export interface ConversionResult {
  success: boolean;
  affiliateId?: string;
  commissionId?: string;
  commissionAmount?: number;
  error?: string;
}

/**
 * Track a purchase conversion and award commission
 * Call this after a successful payment/order
 */
export async function trackConversion(params: {
  userId: string;
  orderId: string;
  orderAmount: number;
  referralCode?: string; // Optional override, otherwise uses cookie
}): Promise<ConversionResult> {
  try {
    // Get referral code from cookie or param
    const referralCode = params.referralCode || (await getStoredReferralCode());

    if (!referralCode) {
      return { success: false, error: "No referral code found" };
    }

    const supabase = (await createClient()) as AnyClient;

    // Find the affiliate
    const { data: affiliate, error: affError } = (await supabase
      .from("affiliates")
      .select("id, status, commission_rate")
      .eq("referral_code", referralCode)
      .single()) as {
      data: Pick<Affiliate, "id" | "status" | "commission_rate"> | null;
      error: unknown;
    };

    if (affError || !affiliate || affiliate.status !== "approved") {
      return { success: false, error: "Affiliate not found or not approved" };
    }

    // Find the referral record for this user
    const { data: referral } = (await supabase
      .from("affiliate_referrals")
      .select("id, status")
      .eq("referred_user_id", params.userId)
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()) as {
      data: Pick<AffiliateReferral, "id" | "status"> | null;
    };

    // Check if already converted
    if (referral?.status === "converted") {
      return {
        success: false,
        error: "This referral has already converted",
      };
    }

    // Record the commission
    const commissionResult = await recordCommission({
      affiliateId: affiliate.id,
      referralId: referral?.id,
      orderId: params.orderId,
      orderAmount: params.orderAmount,
      commissionRate: affiliate.commission_rate,
    });

    if (!commissionResult.success) {
      return { success: false, error: commissionResult.error };
    }

    // Update the referral status to converted
    if (referral) {
      await supabase
        .from("affiliate_referrals")
        .update({
          status: "converted",
          converted_at: new Date().toISOString(),
        })
        .eq("id", referral.id);
    }

    // Increment conversion count
    await supabase.rpc("increment_affiliate_conversions", {
      p_affiliate_id: affiliate.id,
    });

    // Clear the referral cookie
    await clearReferralCookie();

    return {
      success: true,
      affiliateId: affiliate.id,
      commissionId: commissionResult.commissionId,
      commissionAmount: (params.orderAmount * affiliate.commission_rate) / 100,
    };
  } catch (error) {
    console.error("Error tracking conversion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get affiliate attribution for a user
 * Use this to check if a user was referred
 */
export async function getUserAffiliateAttribution(userId: string): Promise<{
  hasAffiliate: boolean;
  affiliateId?: string;
  referralCode?: string;
  status?: string;
}> {
  try {
    const supabase = (await createClient()) as AnyClient;

    const { data: referral } = await supabase
      .from("affiliate_referrals")
      .select(
        "affiliate_id, referral_code, status, affiliates:affiliate_id(referral_code)",
      )
      .eq("referred_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!referral) {
      return { hasAffiliate: false };
    }

    return {
      hasAffiliate: true,
      affiliateId: referral.affiliate_id,
      referralCode: referral.referral_code,
      status: referral.status,
    };
  } catch {
    return { hasAffiliate: false };
  }
}

/**
 * Bulk process pending commissions (for admin/cron jobs)
 */
export async function approveAllPendingCommissions(
  affiliateId: string,
): Promise<{
  approved: number;
  total: number;
}> {
  const supabase = (await createClient()) as AnyClient;

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("id")
    .eq("affiliate_id", affiliateId)
    .eq("status", "pending");

  if (!commissions || commissions.length === 0) {
    return { approved: 0, total: 0 };
  }

  const { error } = await supabase
    .from("affiliate_commissions")
    .update({ status: "approved" })
    .eq("affiliate_id", affiliateId)
    .eq("status", "pending");

  return {
    approved: error ? 0 : commissions.length,
    total: commissions.length,
  };
}

/**
 * Get conversion analytics for an affiliate
 */
export async function getConversionAnalytics(affiliateId: string): Promise<{
  totalConversions: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate: number;
  recentConversions: Array<{
    date: string;
    orderAmount: number;
    commission: number;
  }>;
}> {
  const supabase = (await createClient()) as AnyClient;

  // Get affiliate stats
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("total_referrals, total_conversions")
    .eq("id", affiliateId)
    .single();

  // Get commission totals
  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("order_amount, commission_amount, created_at")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalRevenue =
    commissions?.reduce(
      (sum: number, c: { order_amount: number }) => sum + c.order_amount,
      0,
    ) || 0;

  const totalCommissions =
    commissions?.reduce(
      (sum: number, c: { commission_amount: number }) =>
        sum + c.commission_amount,
      0,
    ) || 0;

  const conversionRate =
    affiliate?.total_referrals > 0
      ? (affiliate.total_conversions / affiliate.total_referrals) * 100
      : 0;

  return {
    totalConversions: affiliate?.total_conversions || 0,
    totalRevenue,
    totalCommissions,
    conversionRate: Math.round(conversionRate * 100) / 100,
    recentConversions:
      commissions?.map(
        (c: {
          created_at: string;
          order_amount: number;
          commission_amount: number;
        }) => ({
          date: c.created_at,
          orderAmount: c.order_amount,
          commission: c.commission_amount,
        }),
      ) || [],
  };
}

