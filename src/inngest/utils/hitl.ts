/**
 * HITL (Human-in-the-Loop) Utilities for Inngest Functions
 * Integrates ApprovalGate with Inngest's step.waitForEvent for durable HITL workflows
 *
 * Per backend-design/SKILL.md:
 * - All high-impact actions should support approval gates
 * - step.waitForEvent MUST have strict timeout (e.g., "7d")
 * - Autonomy mode determines when to pause
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AgentType } from "@/agents/base/types";
import { ApprovalGate, type CreateApprovalInput } from "@/agents/hitl";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Autonomy mode per SKILL.md 3-tier system
 * - manual: Ask after every step
 * - smart: Ask only if unsure or high cost (Default)
 * - auto: Just do it
 */
export type AutonomyMode = "manual" | "smart" | "auto";

/**
 * Default AI model per SKILL.md
 */
export const DEFAULT_AI_MODEL = "gemini-3-flash";

/**
 * Allowed AI models for validation
 */
export const ALLOWED_MODELS = [
  "gemini-3-flash",
  "gemini-3-pro",
  "gemini-2.5-pro",
  "gpt-5.2",
  "gpt-5.0",
  "gpt-5-mini",
  "claude-sonnet-4.5",
  "claude-opus-4.5",
  "claude-haiku-4.5",
] as const;

export type AllowedModel = (typeof ALLOWED_MODELS)[number];

/**
 * Validate and normalize model selection
 * Per SKILL.md: Validate against list of allowed models
 */
export function validateModel(model?: string): AllowedModel {
  if (!model) return DEFAULT_AI_MODEL;
  if (ALLOWED_MODELS.includes(model as AllowedModel)) {
    return model as AllowedModel;
  }
  // Invalid model, fall back to default
  return DEFAULT_AI_MODEL;
}

/**
 * Common event data interface with SKILL.md required fields
 */
export interface AgentEventData {
  orgId: string;
  model?: string; // Dynamic model selection
  autonomy_mode?: AutonomyMode; // 3-tier autonomy
  trace_id?: string; // Observability
}

/**
 * Actions that should require approval in different autonomy modes
 */
export const HIGH_IMPACT_ACTIONS = [
  "send_outreach",
  "publish_content",
  "send_email",
  "send_sms",
  "create_proposal",
  "send_partner_outreach",
] as const;

/**
 * Check if an action requires approval based on autonomy mode
 * Per SKILL.md 3-tier autonomy system
 */
export function requiresApproval(
  action: string,
  autonomyMode: AutonomyMode,
  confidence?: number,
): boolean {
  // Auto mode never requires approval (unless critical error)
  if (autonomyMode === "auto") return false;

  // Manual mode always requires approval
  if (autonomyMode === "manual") return true;

  // Smart mode: approve high-impact actions or low confidence
  if (autonomyMode === "smart") {
    const isHighImpact = HIGH_IMPACT_ACTIONS.includes(action as any);
    const isLowConfidence = confidence !== undefined && confidence < 0.8;
    return isHighImpact || isLowConfidence;
  }

  return false;
}

/**
 * Request approval and wait via Inngest step.waitForEvent
 * Per SKILL.md: Uses ApprovalGate + step.waitForEvent with timeout
 *
 * @param step - Inngest step object
 * @param input - Approval request input
 * @returns The approval result
 */
export async function requestApprovalAndWait(
  step: {
    run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    waitForEvent: (
      name: string,
      opts: { event: string; timeout: string; match?: string },
    ) => Promise<{ data: Record<string, unknown> } | null>;
  },
  input: {
    orgId: string;
    agentType: AgentType;
    action: string;
    title: string;
    description?: string;
    params: Record<string, unknown>;
    previewData?: Record<string, unknown>;
    riskLevel?: "low" | "medium" | "high" | "critical";
    workflowRunId?: string;
  },
): Promise<{ approved: boolean; comment?: string }> {
  // Step 1: Create approval request
  const approvalId = await step.run("request-approval", async () => {
    const db =
      createSupabaseAdminClient() as unknown as SupabaseClient<Database>;
    const gate = new ApprovalGate(db, input.orgId);

    const request = await gate.requestApproval({
      agent_type: input.agentType,
      action: input.action,
      title: input.title,
      description: input.description,
      params: input.params,
      preview_data: input.previewData,
      risk_level: input.riskLevel || "medium",
      workflow_run_id: input.workflowRunId,
    });

    // If auto-approved, return special marker
    if (request.status === "auto_approved") {
      return `auto:${request.id}`;
    }

    return request.id;
  });

  // Check for auto-approval
  if (approvalId.startsWith("auto:")) {
    return { approved: true };
  }

  // Step 2: Wait for approval event (per SKILL.md: MUST have timeout)
  const result = await step.waitForEvent("wait-for-approval", {
    event: "approval/resolved",
    timeout: "7d", // Per SKILL.md: Mandatory timeout
    match: "data.approvalId",
  });

  // Handle timeout (no result)
  if (!result) {
    // Mark as expired in database
    await step.run("mark-expired", async () => {
      const db =
        createSupabaseAdminClient() as unknown as SupabaseClient<Database>;
      const gate = new ApprovalGate(db, input.orgId);
      await gate.resolve(approvalId, {
        status: "rejected",
        approved_by: "system",
        comment: "Approval request expired after 7 days",
      });
    });
    return { approved: false, comment: "Request expired" };
  }

  // Extract typed data from result
  const resultData = result.data as {
    status?: "approved" | "rejected";
    comment?: string;
  };

  return {
    approved: resultData.status === "approved",
    comment: resultData.comment,
  };
}

/**
 * Helper to extract and validate common event data
 */
export function parseAgentEventData<T extends AgentEventData>(
  eventData: unknown,
): T & { model: AllowedModel; autonomy_mode: AutonomyMode } {
  const data = eventData as T;
  return {
    ...data,
    model: validateModel(data.model),
    autonomy_mode: data.autonomy_mode || "smart",
  };
}
