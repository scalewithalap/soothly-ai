/**
 * Agent Usage Deduction Utility
 * Centralized helpers for the success-based billing model.
 *
 * Per agents-ecosystem SKILL.md: "Usage is deducted ONLY when an agent
 * returns a status: completed result."
 *
 * Model (aligned with supabase/migrations/0001_billing_enforcement.sql):
 * - org_usage holds one row per (org, feature_key, period_start)
 * - tier_feature_limits holds (tier, feature_key, monthly_limit, safety_cap)
 * - check_and_increment_usage RPC performs the atomic check+increment
 * - Agent types map to feature keys via AGENT_FEATURE_KEY (lib/billing/tiers)
 *
 * Two usage patterns:
 * 1. PRE-CHECK (cheap, advisory): checkAgentUsage() before starting work, so
 *    we don't burn AI spend on a run that can't be credited.
 * 2. DEDUCT (atomic, authoritative): deductAgentUsage() after completion.
 *    This is the call that actually consumes quota.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AgentType } from "@/lib/agents/base/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENT_FEATURE_KEY } from "@/lib/billing/tiers";

function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

interface UsageRpcResult {
  allowed: boolean;
  error?: string;
  message?: string;
  current_count: number;
  limit: number;
  remaining: number;
  period_end?: string;
}

/**
 * Deduct usage for an agent action after successful completion.
 * Atomic via check_and_increment_usage RPC. Logs to activities.
 */
export async function deductAgentUsage(
  orgId: string,
  agentType: AgentType,
  usageCount: number,
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  if (usageCount <= 0) {
    return { success: true, remaining: undefined };
  }

  const featureKey = AGENT_FEATURE_KEY[agentType];
  if (!featureKey) {
    return { success: false, error: `Unknown agent type: ${agentType}` };
  }

  const supabase = getUntypedClient();

  try {
    const { data, error } = await supabase.rpc("check_and_increment_usage", {
      p_org_id: orgId,
      p_feature_key: featureKey,
      p_increment_by: usageCount,
    });

    if (error) {
      console.error(`Failed to deduct usage for ${agentType}:`, error);
      return { success: false, error: error.message };
    }

    const result = data as UsageRpcResult;
    if (!result.allowed) {
      // Completed work exceeded remaining quota (e.g. a scrape returned more
      // rows than remaining). Record the overage instead of silently losing
      // it; billing can reconcile from activities.
      console.warn(
        `Usage deduction over limit for ${agentType} (${featureKey}): ${result.message}`,
      );
    }

    await supabase.from("activities").insert({
      org_id: orgId,
      agent_type: agentType,
      action: "usage_deducted",
      entity_type: "usage",
      entity_id: featureKey,
      description: `Deducted ${usageCount} ${featureKey} unit(s) for ${agentType}`,
      metadata: {
        usageCount,
        allowed: result.allowed,
        remaining: result.remaining,
        limit: result.limit,
      },
    });

    return {
      success: result.allowed,
      remaining: result.remaining,
      error: result.allowed ? undefined : result.error,
    };
  } catch (err) {
    console.error(`Usage deduction error for ${agentType}:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * Read-only check: does the org have remaining quota for an agent type?
 * Uses current-period org_usage row + tier_feature_limits. Fails CLOSED
 * (no quota) on error, consistent with lib/services/usage-limits.ts.
 */
export async function checkAgentUsage(
  orgId: string,
  agentType: AgentType,
): Promise<{ hasUsage: boolean; remaining: number; limit: number }> {
  const featureKey = AGENT_FEATURE_KEY[agentType];
  if (!featureKey) {
    return { hasUsage: false, remaining: 0, limit: 0 };
  }

  const supabase = getUntypedClient();

  try {
    const { data: org } = await supabase
      .from("organizations")
      .select("subscription_tier")
      .eq("id", orgId)
      .single();
    const tier = org?.subscription_tier || "free";

    const { data: limitRow } = await supabase
      .from("tier_feature_limits")
      .select("monthly_limit")
      .eq("tier", tier)
      .eq("feature_key", featureKey)
      .single();

    const limit = limitRow?.monthly_limit ?? 0;
    if (limit < 0) {
      // -1 = feature not available on this tier (e.g. superagent on free)
      return { hasUsage: false, remaining: 0, limit: 0 };
    }

    const nowIso = new Date().toISOString();
    const { data: usageRows } = await supabase
      .from("org_usage")
      .select("current_count, period_end")
      .eq("org_id", orgId)
      .eq("feature_key", featureKey)
      .gt("period_end", nowIso)
      .order("period_start", { ascending: false })
      .limit(1);

    const used = usageRows?.[0]?.current_count ?? 0;
    const remaining = Math.max(0, limit - used);
    return { hasUsage: remaining > 0, remaining, limit };
  } catch (err) {
    console.error(`Usage check error for ${agentType}:`, err);
    return { hasUsage: false, remaining: 0, limit: 0 };
  }
}

/**
 * Usage summary for an organization across all agent types.
 * Single RPC round-trip (get_usage_summary), shaped for dashboard cards.
 */
export async function getUsageSummary(
  orgId: string,
): Promise<
  Record<AgentType, { count: number; limit: number; remaining: number }>
> {
  const supabase = getUntypedClient();
  const empty = {} as Record<
    AgentType,
    { count: number; limit: number; remaining: number }
  >;

  try {
    const { data, error } = await supabase.rpc("get_usage_summary", {
      p_org_id: orgId,
    });
    if (error || !data) {
      console.error("get_usage_summary failed:", error);
      return empty;
    }

    const features =
      (
        data as {
          features?: Record<
            string,
            { used: number; limit: number; remaining: number }
          >;
        }
      ).features ?? {};

    const summary = empty;
    for (const [agentType, featureKey] of Object.entries(AGENT_FEATURE_KEY)) {
      const f = features[featureKey];
      summary[agentType as AgentType] = {
        count: f?.used ?? 0,
        limit: f?.limit ?? 0,
        remaining: f?.remaining ?? 0,
      };
    }
    return summary;
  } catch (err) {
    console.error("Usage summary error:", err);
    return empty;
  }
}
