/**
 * Commission Calculation Service
 * Handles commission computation and payout logic
 */

import { createClient } from "@/lib/supabase/server";
import type { Affiliate } from "./types";

type AnyClient = any;

export interface CommissionCalculation {
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
}

/**
 * Calculate commission for an order
 */
export function calculateCommission(
  orderAmount: number,
  commissionRate: number = 20,
): CommissionCalculation {
  const rate = Math.min(Math.max(commissionRate, 0), 100); // Clamp 0-100
  const commissionAmount = (orderAmount * rate) / 100;

  return {
    orderAmount,
    commissionRate: rate,
    commissionAmount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Record a commission for an affiliate
 */
export async function recordCommission(params: {
  affiliateId: string;
  referralId?: string;
  orderId: string;
  orderAmount: number;
  commissionRate?: number;
}): Promise<{ success: boolean; commissionId?: string; error?: string }> {
  try {
    const supabase = (await createClient()) as AnyClient;

    // Get affiliate's commission rate if not provided
    let rate = params.commissionRate;
    if (!rate) {
      const { data: affiliate } = (await supabase
        .from("affiliates")
        .select("commission_rate")
        .eq("id", params.affiliateId)
        .single()) as { data: Pick<Affiliate, "commission_rate"> | null };
      rate = affiliate?.commission_rate || 20;
    }

    const { commissionAmount } = calculateCommission(params.orderAmount, rate);

    // Insert commission record
    const { data, error } = await supabase
      .from("affiliate_commissions")
      .insert({
        affiliate_id: params.affiliateId,
        referral_id: params.referralId,
        order_id: params.orderId,
        order_amount: params.orderAmount,
        commission_rate: rate,
        commission_amount: commissionAmount,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Update affiliate totals
    await supabase.rpc("update_affiliate_earnings", {
      p_affiliate_id: params.affiliateId,
      p_amount: commissionAmount,
    });

    return { success: true, commissionId: data.id };
  } catch (error) {
    console.error("Error recording commission:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get affiliate stats summary
 */
export async function getAffiliateStats(affiliateId: string): Promise<{
  totalReferrals: number;
  totalConversions: number;
  totalEarned: number;
  pendingBalance: number;
  totalPaid: number;
}> {
  try {
    const supabase = (await createClient()) as AnyClient;

    const { data } = (await supabase
      .from("affiliates")
      .select(
        "total_referrals, total_conversions, total_earned, pending_balance, total_paid",
      )
      .eq("id", affiliateId)
      .single()) as {
      data: Pick<
        Affiliate,
        | "total_referrals"
        | "total_conversions"
        | "total_earned"
        | "pending_balance"
        | "total_paid"
      > | null;
    };

    return {
      totalReferrals: data?.total_referrals || 0,
      totalConversions: data?.total_conversions || 0,
      totalEarned: data?.total_earned || 0,
      pendingBalance: data?.pending_balance || 0,
      totalPaid: data?.total_paid || 0,
    };
  } catch {
    return {
      totalReferrals: 0,
      totalConversions: 0,
      totalEarned: 0,
      pendingBalance: 0,
      totalPaid: 0,
    };
  }
}

/**
 * Request a payout
 */
export async function requestPayout(params: {
  affiliateId: string;
  amount: number;
  paymentMethod: string;
}): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  try {
    const supabase = (await createClient()) as AnyClient;

    // Verify affiliate has enough balance
    const { data: affiliate } = (await supabase
      .from("affiliates")
      .select("pending_balance, payment_method, payment_details")
      .eq("id", params.affiliateId)
      .single()) as {
      data: Pick<
        Affiliate,
        "pending_balance" | "payment_method" | "payment_details"
      > | null;
    };

    if (!affiliate) {
      return { success: false, error: "Affiliate not found" };
    }

    if (affiliate.pending_balance < params.amount) {
      return { success: false, error: "Insufficient balance" };
    }

    if (params.amount < 50) {
      return { success: false, error: "Minimum payout is $50" };
    }

    // Create payout request
    const { data, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id: params.affiliateId,
        amount: params.amount,
        payment_method: params.paymentMethod,
        status: "requested",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Deduct from pending balance
    await supabase.rpc("deduct_affiliate_balance", {
      p_affiliate_id: params.affiliateId,
      p_amount: params.amount,
    });

    return { success: true, payoutId: data.id };
  } catch (error) {
    console.error("Error requesting payout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
