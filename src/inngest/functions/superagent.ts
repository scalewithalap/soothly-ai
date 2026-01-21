/**
 * Superagent Inngest Functions
 * Background jobs for orchestrating multi-agent campaigns
 *
 * Function: Campaign Orchestration
 * Trigger: 'superagent/campaign.plan', 'superagent/campaign.execute'
 *
 * Flow:
 * 1. plan: Generate campaign steps from template + inputs
 * 2. execute: Run steps in order, respecting dependencies
 * 3. monitor: Track progress and handle failures
 * 4. complete: Aggregate results and notify
 *
 * Resiliency:
 * - Each step is idempotent (uses step IDs)
 * - Failed steps can be retried individually
 * - Campaign can be cancelled mid-execution
 */

import { inngest } from "@/inngest/client";
import { SUPERAGENT_EVENTS } from "@/inngest/events";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getGemini } from "@/lib/ai";
import {
  parseAgentEventData,
  requiresApproval,
  requestApprovalAndWait,
} from "@/inngest/utils";
import {
  notifyAgentCompletion,
  getOrgOwnerNotificationPreferences,
} from "@/lib/notifications";
import {
  CampaignPlanSchema,
  safeParseLLMOutput,
} from "@/agents/schemas/llm-output-schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentType } from "@/agents/base/types";

// Type helper
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

// Campaign types
type CampaignType =
  | "niche_takeover"
  | "content_blitz"
  | "outbound_campaign"
  | "competitive_response"
  | "custom";

// Pre-built templates
const TEMPLATES: Record<
  CampaignType,
  {
    name: string;
    steps: Array<{
      agentType: AgentType;
      action: string;
      params: Record<string, unknown>;
      dependsOn?: string[];
    }>;
  }
> = {
  niche_takeover: {
    name: "Niche Takeover Campaign",
    steps: [
      {
        agentType: "competitor_intel",
        action: "analyze",
        params: { url: "{{competitorUrl}}" },
      },
      {
        agentType: "seo",
        action: "generate",
        params: { topic: "{{targetNiche}}" },
        dependsOn: ["step_0"],
      },
      {
        agentType: "lead_gen",
        action: "find",
        params: { industry: "{{targetNiche}}", count: 500 },
      },
      {
        agentType: "partnership",
        action: "discover",
        params: { niche: "{{targetNiche}}" },
      },
    ],
  },
  content_blitz: {
    name: "Content Blitz",
    steps: [
      {
        agentType: "competitor_intel",
        action: "gaps",
        params: { topic: "{{topic}}" },
      },
      {
        agentType: "seo",
        action: "series",
        params: { topic: "{{topic}}", count: "{{articleCount}}" },
        dependsOn: ["step_0"],
      },
    ],
  },
  outbound_campaign: {
    name: "Outbound Sales Campaign",
    steps: [
      {
        agentType: "lead_gen",
        action: "scrape",
        params: {
          title: "{{targetTitle}}",
          industry: "{{targetIndustry}}",
        },
      },
      {
        agentType: "lead_gen",
        action: "enrich",
        params: {},
        dependsOn: ["step_0"],
      },
    ],
  },
  competitive_response: {
    name: "Competitive Response",
    steps: [
      {
        agentType: "competitor_intel",
        action: "deep",
        params: { competitorId: "{{competitorId}}" },
      },
      {
        agentType: "seo",
        action: "counter",
        params: {},
        dependsOn: ["step_0"],
      },
    ],
  },
  custom: {
    name: "Custom Campaign",
    steps: [],
  },
};

/**
 * Interpolate template variables with actual values
 */
function interpolate(
  params: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      typeof value === "string" &&
      value.startsWith("{{") &&
      value.endsWith("}}")
    ) {
      const inputKey = value.slice(2, -2);
      result[key] = inputs[inputKey] ?? value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Map agent action to Inngest event
 */
function getEventName(agentType: AgentType, action: string): string {
  const eventMap: Record<AgentType, string> = {
    lead_gen: "leads/campaign.created",
    seo: "seo/brief.created",
    partnership: "partners/discover.requested",
    proposal: "proposal/create.full",
    competitor_intel: "intel/scan.daily",
    customer_success: "support/ticket.created",
    revenue_recovery: "recovery/payment.retry",
    onboarding: "onboarding/progress.check",
    superagent: "superagent/campaign.execute",
  };
  return eventMap[agentType] || `${agentType}/${action}`;
}

// ============================================
// CAMPAIGN PLANNING
// ============================================

/**
 * Plan a new campaign
 */
export const planCampaign = inngest.createFunction(
  {
    id: "superagent-plan-campaign",
    name: "Plan Campaign",
    retries: 2,
  },
  { event: "superagent/campaign.plan" },
  async ({ event, step }) => {
    const eventData = parseAgentEventData<{
      type: CampaignType;
      objective: string;
      inputs: Record<string, unknown>;
      orgId: string;
    }>(event.data);
    const { type, objective, inputs, orgId, model, autonomy_mode } = eventData;

    // Step 1: Get template
    const template = TEMPLATES[type] || TEMPLATES.custom;

    // Step 2: Use AI to customize plan if custom type
    let steps = template.steps;
    if (type === "custom") {
      const customPlan = await step.run("ai-plan", async () => {
        const ai = getGemini();
        const prompt = `Create a multi-agent campaign plan for this objective:

Objective: "${objective}"
Available Inputs: ${JSON.stringify(inputs)}

Available Agents:
- lead_gen: Find and enrich B2B leads
- seo: Create SEO content
- partnership: Find affiliate partners
- proposal: Generate sales proposals
- competitor_intel: Monitor competitors

Return JSON array of steps:
[
  { "agentType": "...", "action": "...", "params": {...}, "dependsOn": [] }
]

Max 5 steps. Use dependsOn to create proper ordering.`;

        const result = await ai.complete(prompt, { model, temperature: 0.5 });

        // Validate with Zod schema per backend-design/SKILL.md
        const { success, data, errors } = safeParseLLMOutput(
          CampaignPlanSchema,
          result.content,
          [],
        );

        if (!success) {
          console.warn(
            "Superagent campaign plan validation failed:",
            errors?.issues,
          );
        }

        return data;
      });
      steps = customPlan;
    }

    // Step 3: Create campaign record
    const campaign = await step.run("create-campaign", async () => {
      const supabase = getUntypedClient();

      const campaignSteps = steps.map((s, i) => ({
        id: `step_${i}`,
        agentType: s.agentType,
        action: s.action,
        params: interpolate(s.params, inputs),
        dependsOn: s.dependsOn || [],
        status: "pending",
      }));

      const { data } = await supabase
        .from("superagent_campaigns")
        .insert({
          org_id: orgId,
          type,
          name: template.name,
          objective,
          inputs,
          steps: campaignSteps,
          status: "planning",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      return data;
    });

    // Step 4: Check approval for execution
    if (requiresApproval("execute_campaign", autonomy_mode)) {
      const approval = await requestApprovalAndWait(step as any, {
        orgId,
        agentType: "superagent" as AgentType,
        action: "execute_campaign",
        title: `Execute "${template.name}" campaign`,
        description: objective,
        params: { campaignId: campaign?.id },
        previewData: {
          type,
          stepsCount: steps.length,
          steps: steps.map((s) => `${s.agentType}: ${s.action}`),
        },
        riskLevel: "high",
      });

      if (!approval.approved) {
        await step.run("mark-cancelled", async () => {
          const supabase = getUntypedClient();
          await supabase
            .from("superagent_campaigns")
            .update({ status: "cancelled" })
            .eq("id", campaign?.id);
        });

        return {
          success: true,
          campaignId: campaign?.id,
          status: "cancelled",
          reason: "Not approved",
        };
      }
    }

    // Step 5: Trigger execution
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_EXECUTE,
      data: { campaignId: campaign?.id, orgId },
    });

    return {
      success: true,
      campaignId: campaign?.id,
      status: "executing",
      stepsPlanned: steps.length,
    };
  },
);

// ============================================
// CAMPAIGN EXECUTION
// ============================================

/**
 * Execute a planned campaign
 */
export const executeCampaign = inngest.createFunction(
  {
    id: "superagent-execute-campaign",
    name: "Execute Campaign",
    retries: 2,
  },
  { event: "superagent/campaign.execute" },
  async ({ event, step }) => {
    const eventData = parseAgentEventData<{
      campaignId: string;
      orgId: string;
    }>(event.data);
    const { campaignId, orgId } = eventData;

    // Step 1: Get campaign
    const campaign = await step.run("get-campaign", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("superagent_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      return data;
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Step 2: Update status to executing
    await step.run("mark-executing", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("superagent_campaigns")
        .update({ status: "executing", started_at: new Date().toISOString() })
        .eq("id", campaignId);
    });

    // Step 3: Execute steps in order
    const steps = campaign.steps as Array<{
      id: string;
      agentType: AgentType;
      action: string;
      params: Record<string, unknown>;
      dependsOn: string[];
      status: string;
    }>;

    const completedSteps = new Set<string>();
    const results: Record<string, unknown> = {};

    // Execute steps respecting dependencies
    for (let round = 0; round < steps.length; round++) {
      // Find executable steps
      const executableSteps = steps.filter((s) => {
        if (s.status === "completed" || completedSteps.has(s.id)) return false;
        if (s.dependsOn.length === 0) return true;
        return s.dependsOn.every((dep) => completedSteps.has(dep));
      });

      if (executableSteps.length === 0) break;

      // Execute each step
      for (const execStep of executableSteps) {
        const stepResult = await step.run(
          `execute-${execStep.id}`,
          async () => {
            // Merge params with results from previous steps
            const enrichedParams = {
              ...execStep.params,
              orgId,
              campaignId,
              previousResults: results,
            };

            // Send event to the target agent
            await inngest.send({
              name: getEventName(execStep.agentType, execStep.action),
              data: enrichedParams,
            });

            return { triggered: true, agentType: execStep.agentType };
          },
        );

        completedSteps.add(execStep.id);
        results[execStep.id] = stepResult;

        // Update step status in database
        await step.run(`update-${execStep.id}`, async () => {
          const supabase = getUntypedClient();
          const updatedSteps = steps.map((s) =>
            s.id === execStep.id
              ? {
                  ...s,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                }
              : s,
          );
          await supabase
            .from("superagent_campaigns")
            .update({ steps: updatedSteps })
            .eq("id", campaignId);
        });
      }

      // Small delay between rounds
      if (round < steps.length - 1) {
        await step.sleep("inter-step-delay", "5s");
      }
    }

    // Step 4: Mark campaign as completed
    await step.run("mark-completed", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("superagent_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          results,
        })
        .eq("id", campaignId);
    });

    // Step 5: Notify owner
    await step.run("notify-completion", async () => {
      const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
      if (ownerPrefs?.preferences.eventPreferences.agentCompletion) {
        const supabase = getUntypedClient();
        const { data: owner } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("org_id", orgId)
          .single();

        if (owner) {
          await notifyAgentCompletion(
            { email: owner.email, name: owner.full_name },
            {
              agentName: "Superagent",
              action: "Campaign Completed",
              details: `"${campaign.name}" finished with ${completedSteps.size} steps completed`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    // Step 6: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "superagent",
        action: "campaign_completed",
        entity_type: "campaign",
        entity_id: campaignId,
        description: `Campaign "${campaign.name}" completed with ${completedSteps.size} steps`,
        metadata: { type: campaign.type, stepsCompleted: completedSteps.size },
      });
    });

    return {
      success: true,
      campaignId,
      status: "completed",
      stepsCompleted: completedSteps.size,
    };
  },
);

/**
 * Cancel a running campaign
 */
export const cancelCampaign = inngest.createFunction(
  {
    id: "superagent-cancel-campaign",
    name: "Cancel Campaign",
  },
  { event: "superagent/campaign.cancel" },
  async ({ event, step }) => {
    const { campaignId, orgId } = event.data as {
      campaignId: string;
      orgId: string;
    };

    await step.run("cancel-campaign", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("superagent_campaigns")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "superagent",
        action: "campaign_cancelled",
        entity_type: "campaign",
        entity_id: campaignId,
        description: "Campaign cancelled by user",
      });
    });

    return { success: true, campaignId, status: "cancelled" };
  },
);
