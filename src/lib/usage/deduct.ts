/**
 * Agent Usage Deduction Utility
 * Centralized middleware for deducting usage after successful agent runs
 *
 * Per SKILL.md: "Usage is deducted ONLY when an agent returns a status: completed result."
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AgentType } from "@/agents/base/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Get untyped client for flexibility
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Deduct usage for an agent action after successful completion
 *
 * @param orgId - Organization ID
 * @param agentType - Type of agent that completed
 * @param usageCount - Number of usage units to deduct (from AgentResult.usageCount)
 * @returns Success status and updated usage info
 */
export async function deductAgentUsage(
  orgId: string,
  agentType: AgentType,
  usageCount: number,
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  if (usageCount <= 0) {
    return { success: true, remaining: undefined };
  }

  const supabase = getUntypedClient();

  try {
    // Call the database function to atomically increment usage
    const { data, error } = await supabase.rpc("increment_agent_usage", {
      p_org_id: orgId,
      p_agent_type: agentType,
      p_count: usageCount,
    });

    if (error) {
      console.error(`Failed to deduct usage for ${agentType}:`, error);
      return { success: false, error: error.message };
    }

    // Log the deduction to activities
    await supabase.from("activities").insert({
      org_id: orgId,
      agent_type: agentType,
      action: "usage_deducted",
      entity_type: "usage",
      entity_id: agentType,
      description: `Deducted ${usageCount} usage unit(s) for ${agentType}`,
      metadata: { usageCount, remaining: data?.remaining },
    });

    return { success: true, remaining: data?.remaining };
  } catch (err) {
    console.error(`Usage deduction error for ${agentType}:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * Check if organization has remaining usage for an agent type
 *
 * @param orgId - Organization ID
 * @param agentType - Type of agent to check
 * @returns Whether usage is available and current remaining count
 */
export async function checkAgentUsage(
  orgId: string,
  agentType: AgentType,
): Promise<{ hasUsage: boolean; remaining: number; limit: number }> {
  const supabase = getUntypedClient();

  const { data, error } = await supabase
    .from("org_usage")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (error || !data) {
    // Default to allowing usage if we can't check
    return { hasUsage: true, remaining: 999, limit: 999 };
  }

  // Map agent type to usage column
  const usageMap: Record<AgentType, { count: string; limit: string }> = {
    lead_gen: { count: "leads_scraped_count", limit: "leads_scraped_limit" },
    seo: { count: "seo_articles_count", limit: "seo_articles_limit" },
    partnership: {
      count: "partner_contacts_count",
      limit: "partner_contacts_limit",
    },
    proposal: { count: "proposals_count", limit: "proposals_limit" },
    competitor_intel: {
      count: "competitors_count",
      limit: "competitors_limit",
    },
    revenue_recovery: {
      count: "recovery_attempts_count",
      limit: "recovery_attempts_limit",
    },
    onboarding: {
      count: "onboarding_users_count",
      limit: "onboarding_users_limit",
    },
    customer_success: {
      count: "support_messages_count",
      limit: "support_messages_limit",
    },
    superagent: {
      count: "superagent_campaigns_count",
      limit: "superagent_campaigns_limit",
    },
  };

  const mapping = usageMap[agentType];
  if (!mapping) {
    return { hasUsage: true, remaining: 999, limit: 999 };
  }

  const count = (data[mapping.count] as number) || 0;
  const limit = (data[mapping.limit] as number) || 0;
  const remaining = Math.max(0, limit - count);

  return {
    hasUsage: remaining > 0,
    remaining,
    limit,
  };
}

/**
 * Get usage summary for an organization
 */
export async function getUsageSummary(
  orgId: string,
): Promise<
  Record<AgentType, { count: number; limit: number; remaining: number }>
> {
  const agentTypes: AgentType[] = [
    "lead_gen",
    "seo",
    "partnership",
    "proposal",
    "competitor_intel",
    "revenue_recovery",
    "onboarding",
    "customer_success",
    "superagent",
  ];

  const summary: Record<
    AgentType,
    { count: number; limit: number; remaining: number }
  > = {} as Record<
    AgentType,
    { count: number; limit: number; remaining: number }
  >;

  for (const agentType of agentTypes) {
    const usage = await checkAgentUsage(orgId, agentType);
    summary[agentType] = {
      count: usage.limit - usage.remaining,
      limit: usage.limit,
      remaining: usage.remaining,
    };
  }

  return summary;
}
