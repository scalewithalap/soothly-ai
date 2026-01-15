/**
 * Credit Balance Utility
 * Calculates real balance from credit_ledger, provides balance checks
 */

import { createClient } from "@supabase/supabase-js";

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CreditBalance {
  available: number;
  used: number;
  total: number;
  isUnlimited: boolean;
}

/**
 * Get current credit balance for an organization
 * Calculates from credit_ledger (most recent balance_after)
 */
export async function getOrgCreditBalance(
  orgId: string
): Promise<CreditBalance> {
  // Get the most recent ledger entry to get current balance
  const { data: lastEntry } = await supabaseAdmin
    .from("credit_ledger")
    .select("balance_after, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get org subscription tier for unlimited check
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("subscription_tier")
    .eq("id", orgId)
    .single();

  const isUnlimited = org?.subscription_tier === "enterprise";

  // Calculate total credits used (sum of negative amounts)
  const { data: usageData } = await supabaseAdmin
    .from("credit_ledger")
    .select("amount")
    .eq("org_id", orgId)
    .lt("amount", 0);

  const used =
    usageData?.reduce((sum, entry) => sum + Math.abs(entry.amount), 0) || 0;
  const available = lastEntry?.balance_after ?? 0;

  // Total is available + used (what they started with + purchases)
  const total = available + used;

  return {
    available,
    used,
    total,
    isUnlimited,
  };
}

/**
 * Check if organization has sufficient credits for an action
 * Returns true if they can proceed, false otherwise
 */
export async function hasEnoughCredits(
  orgId: string,
  requiredCredits: number
): Promise<boolean> {
  const balance = await getOrgCreditBalance(orgId);

  // Enterprise has unlimited credits
  if (balance.isUnlimited) {
    return true;
  }

  return balance.available >= requiredCredits;
}

/**
 * Consume credits AFTER a task completes successfully
 * This is called by agents after task execution
 * USES ATOMIC RPC to prevent race conditions
 */
export async function consumeCreditsAfterSuccess(
  orgId: string,
  agentType: string,
  action: string,
  amount: number,
  referenceId?: string,
  referenceType?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc("deduct_credits", {
      p_org_id: orgId,
      p_amount: amount,
      p_agent_type: agentType,
      p_action: action,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
      p_metadata: {},
    });

    if (error) throw error;

    // Supabase RPC returns JSONB as any, type assertion needed or validation
    const result = data as {
      success: boolean;
      new_balance?: number;
      error?: string;
    };

    if (!result.success) {
      return {
        success: false,
        newBalance: 0,
        error: result.error || "insufficient_credits",
      };
    }

    return { success: true, newBalance: result.new_balance ?? 0 };
  } catch (error) {
    console.error("Credit consumption error:", error);
    return {
      success: false,
      newBalance: 0,
      error: "consumption_failed",
    };
  }
}

/**
 * Add credits to an organization (for purchases, refunds, etc.)
 */
export async function addCredits(
  orgId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance: number }> {
  try {
    const balance = await getOrgCreditBalance(orgId);
    const newBalance = balance.available + amount;

    await supabaseAdmin.from("credit_ledger").insert({
      org_id: orgId,
      agent_type: "system",
      action: reason,
      amount, // Positive for additions
      balance_after: newBalance,
      metadata,
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error("Add credits error:", error);
    return { success: false, newBalance: 0 };
  }
}
