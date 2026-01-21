/**
 * Superagent (Meta-Orchestrator)
 * Coordinates multiple agents to execute complex, multi-step campaigns
 *
 * Role: "The Manager" - Meta-Orchestrator
 * Access: Yearly Plan Exclusive
 * Capability: Triggers other agents' Inngest events via step.invoke
 *
 * Example: "Launch a campaign targeting Real Estate agents"
 * → Intel Agent analyzes competitor
 * → SEO Agent writes content
 * → Lead Gen Agent finds prospects
 * → Partnership Agent finds influencers
 */

import { BaseAgent } from "../base/Agent";
import type {
  AgentTask,
  AgentResult,
  UsageCost,
  AgentType,
} from "../base/types";
import { inngest } from "@/inngest/client";
import {
  SUPERAGENT_EVENTS,
  LEAD_EVENTS,
  SEO_EVENTS,
  PARTNERSHIP_EVENTS,
  INTEL_EVENTS,
  SUPPORT_EVENTS,
  RECOVERY_EVENTS,
  ONBOARDING_EVENTS,
} from "@/inngest/events";

// Campaign types the Superagent can orchestrate
export type CampaignType =
  | "niche_takeover"
  | "content_blitz"
  | "outbound_campaign"
  | "partnership_push"
  | "competitive_response"
  | "custom";

// Campaign status
export type CampaignStatus =
  | "planning"
  | "executing"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

// Step in a campaign workflow
export interface CampaignStep {
  id: string;
  agentType: AgentType;
  action: string;
  params: Record<string, unknown>;
  dependsOn?: string[]; // IDs of steps that must complete first
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: unknown;
  startedAt?: Date;
  completedAt?: Date;
}

// Campaign definition
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  objective: string;
  targetAudience?: string;
  steps: CampaignStep[];
  status: CampaignStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

// Pre-built campaign templates
export interface CampaignTemplate {
  type: CampaignType;
  name: string;
  description: string;
  requiredInputs: string[];
  steps: Omit<CampaignStep, "id" | "status">[];
}

export class Superagent extends BaseAgent {
  readonly name = "superagent" as const;
  readonly displayName = "Superagent";
  readonly description =
    "Meta-orchestrator that coordinates multiple agents for complex campaigns.";

  readonly usageCost: UsageCost = {
    plan: 5,
    execute: 10,
    monitor: 2,
  };

  // Pre-built campaign templates
  private readonly templates: CampaignTemplate[] = [
    {
      type: "niche_takeover",
      name: "Niche Takeover Campaign",
      description: "Full-stack attack on a market segment",
      requiredInputs: ["targetNiche", "competitorUrl"],
      steps: [
        {
          agentType: "competitor_intel",
          action: "analyze_competitor",
          params: { url: "{{competitorUrl}}" },
        },
        {
          agentType: "seo",
          action: "generate_article",
          params: { topic: "{{targetNiche}}", useCompetitorInsights: true },
          dependsOn: ["step_0"],
        },
        {
          agentType: "lead_gen",
          action: "find_leads",
          params: { industry: "{{targetNiche}}", count: 500 },
        },
        {
          agentType: "partnership",
          action: "discover_partners",
          params: { niche: "{{targetNiche}}", minFollowers: 5000 },
        },
      ],
    },
    {
      type: "content_blitz",
      name: "Content Blitz",
      description: "Rapid content creation for SEO domination",
      requiredInputs: ["topic", "articleCount"],
      steps: [
        {
          agentType: "competitor_intel",
          action: "analyze_content_gaps",
          params: { topic: "{{topic}}" },
        },
        {
          agentType: "seo",
          action: "generate_content_series",
          params: { topic: "{{topic}}", count: "{{articleCount}}" },
          dependsOn: ["step_0"],
        },
      ],
    },
    {
      type: "outbound_campaign",
      name: "Outbound Sales Campaign",
      description: "Find and reach leads at scale",
      requiredInputs: ["targetTitle", "targetIndustry", "targetLocation"],
      steps: [
        {
          agentType: "lead_gen",
          action: "scrape_leads",
          params: {
            title: "{{targetTitle}}",
            industry: "{{targetIndustry}}",
            location: "{{targetLocation}}",
          },
        },
        {
          agentType: "lead_gen",
          action: "enrich_leads",
          params: {},
          dependsOn: ["step_0"],
        },
        {
          agentType: "proposal",
          action: "generate_templates",
          params: { industry: "{{targetIndustry}}" },
          dependsOn: ["step_1"],
        },
      ],
    },
    {
      type: "competitive_response",
      name: "Competitive Response",
      description: "React to competitor changes",
      requiredInputs: ["competitorId", "changeType"],
      steps: [
        {
          agentType: "competitor_intel",
          action: "deep_analyze",
          params: { competitorId: "{{competitorId}}", focus: "{{changeType}}" },
        },
        {
          agentType: "seo",
          action: "counter_content",
          params: { competitorId: "{{competitorId}}" },
          dependsOn: ["step_0"],
        },
      ],
    },
  ];

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    // No initialization needed
  }

  /**
   * Execute agent task based on action type
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const { action, params } = task;

    switch (action) {
      case "plan_campaign":
        return this.planCampaign(
          params as {
            type: CampaignType;
            objective: string;
            inputs: Record<string, unknown>;
          },
        );

      case "execute_campaign":
        return this.executeCampaign(
          params as {
            campaignId: string;
          },
        );

      case "get_status":
        return this.getCampaignStatus(
          params as {
            campaignId: string;
          },
        );

      case "cancel_campaign":
        return this.cancelCampaign(
          params as {
            campaignId: string;
          },
        );

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Plan a campaign based on type and inputs
   */
  async planCampaign(params: {
    type: CampaignType;
    objective: string;
    inputs: Record<string, unknown>;
  }): Promise<AgentResult> {
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_PLAN,
      data: {
        type: params.type,
        objective: params.objective,
        inputs: params.inputs,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { status: "planning_started", type: params.type },
    };
  }

  /**
   * Execute a planned campaign
   */
  async executeCampaign(params: { campaignId: string }): Promise<AgentResult> {
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_EXECUTE,
      data: {
        campaignId: params.campaignId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { campaignId: params.campaignId, status: "execution_started" },
    };
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(params: {
    campaignId: string;
  }): Promise<AgentResult> {
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_STATUS,
      data: {
        campaignId: params.campaignId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { campaignId: params.campaignId, status: "checking" },
    };
  }

  /**
   * Cancel a running campaign
   */
  async cancelCampaign(params: { campaignId: string }): Promise<AgentResult> {
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_CANCEL,
      data: {
        campaignId: params.campaignId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { campaignId: params.campaignId, status: "cancelling" },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get available campaign templates
   */
  getTemplates(): CampaignTemplate[] {
    return this.templates;
  }

  /**
   * Get template by type
   */
  getTemplate(type: CampaignType): CampaignTemplate | undefined {
    return this.templates.find((t) => t.type === type);
  }

  /**
   * Interpolate template params with actual values
   */
  interpolateParams(
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
   * Generate unique step IDs for a campaign
   */
  generateStepIds(
    steps: Omit<CampaignStep, "id" | "status">[],
  ): CampaignStep[] {
    return steps.map((step, index) => ({
      ...step,
      id: `step_${index}`,
      status: "pending" as const,
      dependsOn: step.dependsOn?.map((dep) =>
        dep.startsWith("step_") ? dep : `step_${dep}`,
      ),
    }));
  }

  /**
   * Determine which steps can be executed (dependencies met)
   */
  getExecutableSteps(steps: CampaignStep[]): CampaignStep[] {
    const completedIds = new Set(
      steps.filter((s) => s.status === "completed").map((s) => s.id),
    );

    return steps.filter((step) => {
      if (step.status !== "pending") return false;
      if (!step.dependsOn || step.dependsOn.length === 0) return true;
      return step.dependsOn.every((dep) => completedIds.has(dep));
    });
  }

  /**
   * Map agent type to Inngest event name
   */
  getAgentEventName(agentType: AgentType, action: string): string {
    const eventMap: Record<string, Record<string, string>> = {
      lead_gen: {
        find_leads: LEAD_EVENTS.CAMPAIGN_CREATED,
        scrape_leads: LEAD_EVENTS.CAMPAIGN_CREATED,
        enrich_leads: LEAD_EVENTS.ENRICH_REQUESTED,
      },
      seo: {
        generate_article: SEO_EVENTS.BRIEF_CREATED,
        generate_content_series: SEO_EVENTS.BRIEF_CREATED,
        counter_content: SEO_EVENTS.BRIEF_CREATED,
      },
      partnership: {
        discover_partners: PARTNERSHIP_EVENTS.DISCOVERY_REQUESTED,
      },
      proposal: {
        generate_templates: "proposal/generate.requested",
      },
      competitor_intel: {
        analyze_competitor: INTEL_EVENTS.COMPETITOR_CHECK,
        analyze_content_gaps: INTEL_EVENTS.SCAN_DAILY,
        deep_analyze: INTEL_EVENTS.COMPETITOR_CHECK,
      },
      customer_success: {
        process_ticket: SUPPORT_EVENTS.PROCESS_REQUESTED,
      },
      revenue_recovery: {
        retry_payment: RECOVERY_EVENTS.PAYMENT_RETRY,
      },
      onboarding: {
        check_progress: ONBOARDING_EVENTS.PROGRESS_CHECK,
      },
    };

    return eventMap[agentType]?.[action] || `${agentType}/${action}`;
  }
}
