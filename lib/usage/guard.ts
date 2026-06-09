/**
 * Usage Guard — route-level pre-check before dispatching agent work.
 *
 * Pattern (success-based billing, ADR-005):
 *   1. Route calls requireAgentQuota() BEFORE inngest.send() — cheap read,
 *      blocks runs that could never be credited (saves AI spend + Apify cost).
 *   2. Workflow calls deductAgentUsage() AFTER completed work — the atomic,
 *      authoritative deduction.
 *
 * Throws AppError(USAGE_LIMIT_EXCEEDED, 402-style 429) when quota exhausted,
 * shaped for the UpgradeModal on the client.
 */

import { AppError, ErrorCodes } from "@/lib/errors";
import { checkAgentUsage } from "@/lib/usage";
import type { AgentType } from "@/lib/agents/base/types";

export async function requireAgentQuota(
  orgId: string,
  agentType: AgentType,
  units: number = 1,
): Promise<{ remaining: number; limit: number }> {
  const usage = await checkAgentUsage(orgId, agentType);

  if (usage.limit <= 0 && agentType === "superagent") {
    // -1/-0 limit = feature gated off this tier entirely (free plan).
    throw new AppError(
      ErrorCodes.USAGE_LIMIT_EXCEEDED,
      "The Superagent requires a paid plan. Upgrade to Launch, Growth, or Scale.",
      402,
    );
  }

  if (!usage.hasUsage || usage.remaining < units) {
    throw new AppError(
      ErrorCodes.USAGE_LIMIT_EXCEEDED,
      `Monthly limit reached (${usage.limit - usage.remaining}/${usage.limit} used). Upgrade your plan for more.`,
      429,
    );
  }

  return { remaining: usage.remaining, limit: usage.limit };
}
