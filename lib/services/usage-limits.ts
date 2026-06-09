/**
 * Usage Limits Service
 * Implements limit-based pricing per pricing-strategy.md
 *
 * Usage:
 * - Call checkAndIncrementUsage() BEFORE executing agent actions
 * - If allowed=true, proceed with action
 * - If allowed=false, show appropriate error based on error type
 */

import { createClient } from "@supabase/supabase-js";

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Feature keys mapped to agent types per agents-ecosystem.md
 */
export const FEATURE_KEYS = {
  // Proposal Generator (The "Closer")
  PROPOSALS: "proposals",
  // Lead Generation Agent (The "Hunter")
  LEADS_SCRAPED: "leads_scraped",
  // Partnership Agent (The "Recruiter")
  PARTNER_CONTACTS: "partner_contacts",
  // SEO Content Agent (The "Traffic Engine")
  SEO_ARTICLES: "seo_articles",
  // Competitor Intel Agent (The "Spy")
  COMPETITORS: "competitors",
  // Onboarding Agent (The "Guide")
  ONBOARDING_USERS: "onboarding_users",
  // Customer Success Agent (The "Brain")
  SUPPORT_MESSAGES: "support_messages",
  // Revenue Recovery Agent (The "Collector")
  RECOVERY_ATTEMPTS: "recovery_attempts",
  // Superagent (The "Manager") — paid plans only (-1 limit on free)
  SUPERAGENT_CAMPAIGNS: "superagent_campaigns",
  // Team management
  TEAM_MEMBERS: "team_members",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export interface UsageCheckResult {
  allowed: boolean;
  error?: "limit_exceeded" | "safety_cap_exceeded" | "feature_not_configured";
  message?: string;
  currentCount: number;
  limit: number;
  remaining: number;
  periodEnd?: string;
}

export interface UsageInfo {
  featureKey: string;
  currentCount: number;
  limit: number;
  remaining: number;
}

/**
 * Check if an organization can perform an action and increment usage atomically
 *
 * @example
 * const result = await checkAndIncrementUsage(orgId, FEATURE_KEYS.PROPOSALS);
 * if (!result.allowed) {
 *   throw new AppError(result.error, { remaining: result.remaining });
 * }
 */
export async function checkAndIncrementUsage(
  orgId: string,
  featureKey: FeatureKey,
  incrementBy: number = 1,
): Promise<UsageCheckResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "check_and_increment_usage",
      {
        p_org_id: orgId,
        p_feature_key: featureKey,
        p_increment_by: incrementBy,
      },
    );

    if (error) throw error;

    // Parse JSONB response
    const result = data as {
      allowed: boolean;
      error?: string;
      message?: string;
      current_count: number;
      limit: number;
      remaining: number;
      period_end?: string;
      safety_cap?: number;
    };

    return {
      allowed: result.allowed,
      error: result.error as UsageCheckResult["error"],
      message: result.message,
      currentCount: result.current_count,
      limit: result.limit,
      remaining: result.remaining,
      periodEnd: result.period_end,
    };
  } catch (error) {
    console.error("Usage check error:", error);
    // Fail closed - deny on error
    return {
      allowed: false,
      error: "feature_not_configured",
      currentCount: 0,
      limit: 0,
      remaining: 0,
    };
  }
}

/**
 * Get current usage for an organization (without incrementing)
 *
 * @param orgId - Organization ID
 * @param featureKey - Optional specific feature, or null for all features
 */
export async function getOrgUsage(
  orgId: string,
  featureKey?: FeatureKey,
): Promise<UsageInfo | UsageInfo[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_org_usage", {
      p_org_id: orgId,
      p_feature_key: featureKey || null,
    });

    if (error) throw error;

    // Transform snake_case to camelCase
    if (Array.isArray(data)) {
      return data.map((item: Record<string, unknown>) => ({
        featureKey: item.feature_key as string,
        currentCount: item.current_count as number,
        limit: item.limit as number,
        remaining: item.remaining as number,
      }));
    }

    return {
      featureKey: data.feature_key,
      currentCount: data.current_count,
      limit: data.limit,
      remaining: data.remaining,
    };
  } catch (error) {
    console.error("Get usage error:", error);
    return [];
  }
}

/**
 * Check if usage is under a threshold (for warnings)
 */
export async function isUsageLow(
  orgId: string,
  featureKey: FeatureKey,
  thresholdPercent: number = 20,
): Promise<boolean> {
  const usage = await getOrgUsage(orgId, featureKey);
  if (Array.isArray(usage) || !usage.limit) return false;

  const remainingPercent = (usage.remaining / usage.limit) * 100;
  return remainingPercent <= thresholdPercent;
}

/**
 * Map agent type to feature key for usage tracking
 */
export function getFeatureKeyForAgent(agentType: string): FeatureKey | null {
  const mapping: Record<string, FeatureKey> = {
    // New agent type names (per agents-ecosystem.md)
    seo: FEATURE_KEYS.SEO_ARTICLES,
    lead_gen: FEATURE_KEYS.LEADS_SCRAPED,
    partnership: FEATURE_KEYS.PARTNER_CONTACTS,
    proposal: FEATURE_KEYS.PROPOSALS,
    competitor_intel: FEATURE_KEYS.COMPETITORS,
    onboarding: FEATURE_KEYS.ONBOARDING_USERS,
    customer_success: FEATURE_KEYS.SUPPORT_MESSAGES,
    revenue_recovery: FEATURE_KEYS.RECOVERY_ATTEMPTS,
    superagent: FEATURE_KEYS.SUPERAGENT_CAMPAIGNS,
    // Legacy agent type names (for backwards compatibility during migration)
    content: FEATURE_KEYS.SEO_ARTICLES,
    leads: FEATURE_KEYS.LEADS_SCRAPED,
    partners: FEATURE_KEYS.PARTNER_CONTACTS,
    contracts: FEATURE_KEYS.PROPOSALS,
    compliance: FEATURE_KEYS.COMPETITORS,
    receivables: FEATURE_KEYS.SUPPORT_MESSAGES,
    spend: FEATURE_KEYS.ONBOARDING_USERS,
    pricing: FEATURE_KEYS.SUPPORT_MESSAGES,
  };

  return mapping[agentType] || null;
}
