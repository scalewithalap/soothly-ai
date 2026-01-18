/**
 * Affiliate Tiered Commission System
 * Automatically upgrades commission rates based on performance
 */

import { createClient } from "@/lib/supabase/server";
import type { Affiliate } from "./types";

type AnyClient = any;

/**
 * Commission tier definitions
 * Each tier has requirements and associated commission rate
 */
export const COMMISSION_TIERS = [
  {
    name: "Bronze",
    required_conversions: 0,
    required_revenue: 0,
    commission_rate: 15,
    color: "#CD7F32",
  },
  {
    name: "Silver",
    required_conversions: 10,
    required_revenue: 500,
    commission_rate: 20,
    color: "#C0C0C0",
  },
  {
    name: "Gold",
    required_conversions: 25,
    required_revenue: 2000,
    commission_rate: 25,
    color: "#FFD700",
  },
  {
    name: "Platinum",
    required_conversions: 50,
    required_revenue: 5000,
    commission_rate: 30,
    color: "#E5E4E2",
  },
  {
    name: "Diamond",
    required_conversions: 100,
    required_revenue: 15000,
    commission_rate: 35,
    color: "#B9F2FF",
  },
] as const;

export type TierName = (typeof COMMISSION_TIERS)[number]["name"];

export interface AffiliateTier {
  name: TierName;
  commission_rate: number;
  color: string;
  progress: {
    conversions: { current: number; required: number; percentage: number };
    revenue: { current: number; required: number; percentage: number };
  };
  nextTier: {
    name: string;
    conversions_needed: number;
    revenue_needed: number;
  } | null;
}

/**
 * Get the current tier for an affiliate
 */
export function calculateAffiliateTier(
  totalConversions: number,
  totalRevenue: number,
): AffiliateTier {
  let currentTierIndex = 0;

  // Find the highest tier the affiliate qualifies for
  for (let i = COMMISSION_TIERS.length - 1; i >= 0; i--) {
    const tier = COMMISSION_TIERS[i];
    if (
      totalConversions >= tier.required_conversions &&
      totalRevenue >= tier.required_revenue
    ) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = COMMISSION_TIERS[currentTierIndex];
  const nextTier = COMMISSION_TIERS[currentTierIndex + 1];

  // Calculate progress to next tier
  const progress = nextTier
    ? {
        conversions: {
          current: totalConversions,
          required: nextTier.required_conversions,
          percentage: Math.min(
            100,
            (totalConversions / nextTier.required_conversions) * 100,
          ),
        },
        revenue: {
          current: totalRevenue,
          required: nextTier.required_revenue,
          percentage: Math.min(
            100,
            (totalRevenue / nextTier.required_revenue) * 100,
          ),
        },
      }
    : {
        conversions: {
          current: totalConversions,
          required: 0,
          percentage: 100,
        },
        revenue: { current: totalRevenue, required: 0, percentage: 100 },
      };

  return {
    name: currentTier.name,
    commission_rate: currentTier.commission_rate,
    color: currentTier.color,
    progress,
    nextTier: nextTier
      ? {
          name: nextTier.name,
          conversions_needed: Math.max(
            0,
            nextTier.required_conversions - totalConversions,
          ),
          revenue_needed: Math.max(0, nextTier.required_revenue - totalRevenue),
        }
      : null,
  };
}

/**
 * Check and update affiliate tier (call after each conversion)
 */
export async function updateAffiliateTier(affiliateId: string): Promise<{
  upgraded: boolean;
  previousRate: number;
  newRate: number;
  tier: TierName;
}> {
  const supabase = (await createClient()) as AnyClient;

  // Get current affiliate data
  const { data: affiliate } = (await supabase
    .from("affiliates")
    .select("commission_rate, total_conversions, total_earned")
    .eq("id", affiliateId)
    .single()) as {
    data: Pick<
      Affiliate,
      "commission_rate" | "total_conversions" | "total_earned"
    > | null;
  };

  if (!affiliate) {
    return { upgraded: false, previousRate: 0, newRate: 0, tier: "Bronze" };
  }

  const tierInfo = calculateAffiliateTier(
    affiliate.total_conversions,
    affiliate.total_earned,
  );

  const previousRate = affiliate.commission_rate;
  const upgraded = tierInfo.commission_rate > previousRate;

  if (upgraded) {
    // Update commission rate
    await supabase
      .from("affiliates")
      .update({ commission_rate: tierInfo.commission_rate })
      .eq("id", affiliateId);
  }

  return {
    upgraded,
    previousRate,
    newRate: tierInfo.commission_rate,
    tier: tierInfo.name,
  };
}

/**
 * Get leaderboard data
 */
export async function getAffiliateLeaderboard(
  orgId: string,
  limit: number = 10,
): Promise<
  Array<{
    rank: number;
    affiliateId: string;
    userName: string;
    referralCode: string;
    tier: TierName;
    tierColor: string;
    conversions: number;
    earnings: number;
  }>
> {
  const supabase = (await createClient()) as AnyClient;

  const { data: affiliates } = await supabase
    .from("affiliates")
    .select(
      `
      id,
      referral_code,
      total_conversions,
      total_earned,
      commission_rate,
      users:user_id (full_name, email)
    `,
    )
    .eq("org_id", orgId)
    .eq("status", "approved")
    .order("total_earned", { ascending: false })
    .limit(limit);

  if (!affiliates) return [];

  return affiliates.map((affiliate: any, index: number) => {
    const tier = calculateAffiliateTier(
      affiliate.total_conversions,
      affiliate.total_earned,
    );

    return {
      rank: index + 1,
      affiliateId: affiliate.id,
      userName:
        affiliate.users?.full_name || affiliate.users?.email || "Anonymous",
      referralCode: affiliate.referral_code,
      tier: tier.name,
      tierColor: tier.color,
      conversions: affiliate.total_conversions,
      earnings: affiliate.total_earned,
    };
  });
}

