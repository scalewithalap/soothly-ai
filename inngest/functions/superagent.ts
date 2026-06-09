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
} from "@/lib/agents/schemas/llm-output-schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentType } from "@/lib/agents/base/types";
import { deductAgentUsage } from "@/lib/usage";

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
/**
 * Prepare a worker's expected DB record (if any) and return the exact event
 * to dispatch + how to await its completion.
 *
 * Phase 5 fix: the old getEventName() map fired events the workers either
 * don't listen to ("seo/brief.created" — real trigger is content/*) or that
 * reference DB records (campaignId/briefId) which were never created — every
 * chained step silently no-op'd with "Campaign not found". Workers are
 * stateless on purpose (SKILL.md); the orchestrator owns record creation.
 */
async function dispatchAgentStep(
  execStep: {
    id: string;
    agentType: AgentType;
    action: string;
    params: Record<string, unknown>;
  },
  orgId: string,
  campaignName: string,
): Promise<{
  eventName: string;
  eventData: Record<string, unknown>;
  waitEvent?: string;
  correlationField?: string;
  correlationId?: string;
}> {
  const supabase = getUntypedClient();
  const p = execStep.params;

  switch (execStep.agentType) {
    case "lead_gen": {
      const { data: leadCampaign } = await supabase
        .from("lead_campaigns")
        .insert({
          org_id: orgId,
          name: `${campaignName} — leads`,
          target_criteria: {
            industries: p.industry ? [p.industry] : undefined,
            keywords: p.niche ? [p.niche] : p.keywords,
            maxResults: typeof p.count === "number" ? p.count : 50,
          },
          status: "draft",
          leads_collected: 0,
          leads_contacted: 0,
        })
        .select("id")
        .single();
      return {
        eventName: "leads/campaign.created",
        eventData: { campaignId: leadCampaign?.id, orgId },
        waitEvent: "leads/campaign.completed",
        correlationField: "campaignId",
        correlationId: leadCampaign?.id as string,
      };
    }
    case "seo": {
      const topic = (p.topic as string) || (p.niche as string) || "industry insights";
      const { data: brief } = await supabase
        .from("content_briefs")
        .insert({
          org_id: orgId,
          title: `${topic} — campaign article`,
          primary_keyword: topic,
          content_type: "blog_post",
          status: "draft",
        })
        .select("id")
        .single();
      return {
        eventName: "content/article.generate",
        eventData: { briefId: brief?.id, orgId },
        waitEvent: "content/article.completed",
        correlationField: "briefId",
        correlationId: brief?.id as string,
      };
    }
    case "partnership":
      return {
        eventName: "partners/discover.requested",
        eventData: {
          orgId,
          industry: (p.niche as string) ?? (p.industry as string) ?? "",
          partnerType: (p.partnerType as string) ?? "affiliate",
        },
      };
    case "proposal":
      return {
        eventName: "proposal/create.full",
        eventData: { orgId, prospectUrl: p.url ?? p.prospectUrl },
      };
    case "competitor_intel":
      return {
        eventName: "intel/scan.daily",
        eventData: { orgId, triggeredAt: new Date().toISOString() },
      };
    default:
      return {
        eventName: `${execStep.agentType}/${execStep.action}`,
        eventData: { ...p, orgId },
      };
  }
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
    triggers: [{ event: "superagent/campaign.plan" }],
  },
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
    triggers: [{ event: "superagent/campaign.execute" }],
  },
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

      // Honor mid-run cancellation (cancelCampaign sets status=cancelled;
      // the file header promised this but the loop never re-checked).
      const currentStatus = await step.run(`check-status-r${round}`, async () => {
        const supabase = getUntypedClient();
        const { data } = await supabase
          .from("superagent_campaigns")
          .select("status")
          .eq("id", campaignId)
          .single();
        return data?.status as string | undefined;
      });
      if (currentStatus === "cancelled") {
        return {
          success: true,
          campaignId,
          status: "cancelled",
          stepsCompleted: completedSteps.size,
        };
      }

      // Execute each step
      for (const execStep of executableSteps) {
        // 3a. Prepare worker inputs (creates lead_campaigns/content_briefs
        // records the workers expect) and resolve the real trigger event.
        const dispatch = await step.run(`prepare-${execStep.id}`, async () => {
          return dispatchAgentStep(execStep, orgId, campaign.name as string);
        });

        // 3b. Fire the worker's actual trigger event.
        await step.sendEvent(`dispatch-${execStep.id}`, {
          name: dispatch.eventName,
          data: dispatch.eventData,
        });

        // 3c. If the worker emits a completion event, wait for it (correlated)
        // so dependent steps actually run AFTER their dependencies finish —
        // the old code marked steps complete immediately after dispatch.
        let stepResult: Record<string, unknown> = {
          triggered: true,
          agentType: execStep.agentType,
        };
        if (dispatch.waitEvent && dispatch.correlationId) {
          const completion = await step.waitForEvent(`await-${execStep.id}`, {
            event: dispatch.waitEvent,
            timeout: "30m",
            if: `async.data.${dispatch.correlationField} == "${dispatch.correlationId}"`,
          });
          stepResult = {
            ...stepResult,
            completed: completion !== null,
            output: completion?.data ?? null,
            timedOut: completion === null,
          };
        }

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

    // Success-based billing: one superagent_campaigns unit per completed
    // campaign (worker steps bill their own features individually).
    await step.run("deduct-usage", async () => {
      return deductAgentUsage(orgId, "superagent", 1);
    });

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
    triggers: [{ event: "superagent/campaign.cancel" }],
  },
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
