/**
 * Lead Generation Agent
 * Automates lead discovery, enrichment, scoring, and outreach
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, CreditCost } from "../base/types";
import { getOpenAI } from "@/lib/ai";
import { inngest, AgentEvents } from "@/inngest/client";
import type { Database } from "@/types/database";

// Type aliases for database tables
type LeadContact = Database["public"]["Tables"]["lead_contacts"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export class LeadGenAgent extends BaseAgent {
  readonly name = "leads" as const;
  readonly displayName = "Lead Generation";
  readonly description =
    "Automatically find, enrich, and reach out to your ideal customers.";

  readonly creditCost: CreditCost = {
    scrape: 1,
    enrich: 2,
    score: 1,
    outreach: 3,
  };

  private config: {
    idealCustomerProfile?: Record<string, unknown>;
    scoringWeights?: Record<string, number>;
    outreachSettings?: Record<string, unknown>;
  } = {};

  async initialize(): Promise<void> {
    this.config = (await this.getConfig()) as typeof this.config;
    await this.log("info", "LeadGenAgent initialized", { orgId: this.orgId });
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      return { success: false, error: "agent/disabled" };
    }

    switch (task.action) {
      case "create_campaign":
        return this.createCampaign(
          task.params as { name: string; criteria: Record<string, unknown> }
        );
      case "scrape_leads":
        return this.scrapeLeads(
          task.params as { campaignId: string; source: string }
        );
      case "enrich_lead":
        return this.enrichLead(task.params as { leadId: string });
      case "score_leads":
        return this.scoreLeads(task.params as { campaignId: string });
      case "send_outreach":
        return this.sendOutreach(
          task.params as { leadId: string; sequenceId: string }
        );
      default:
        return { success: false, error: "agent/unknown_action" };
    }
  }

  async cleanup(): Promise<void> {
    await this.log("info", "LeadGenAgent cleanup completed");
  }

  // ============================================
  // CAMPAIGN MANAGEMENT
  // ============================================

  private async createCampaign(params: {
    name: string;
    criteria: Record<string, unknown>;
  }): Promise<AgentResult> {
    const { data, error } = await (this.db as any)
      .from("lead_campaigns")
      .insert({
        org_id: this.orgId,
        name: params.name,
        target_criteria: params.criteria,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      await this.log("error", "Failed to create campaign", { error });
      return { success: false, error: "leads/campaign_create_failed" };
    }

    await this.emit("leads/campaign.created", { campaignId: data.id });

    return { success: true, data };
  }

  // ============================================
  // LEAD SCRAPING
  // ============================================

  private async scrapeLeads(params: {
    campaignId: string;
    source: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("scrape", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Trigger async scraping job via Inngest
    await inngest.send({
      name: AgentEvents["leads/scrape.requested"],
      data: {
        orgId: this.orgId,
        campaignId: params.campaignId,
        source: params.source,
      },
    });

    return {
      success: true,
      data: { message: "Scraping job queued", campaignId: params.campaignId },
      creditsUsed: 1,
    };
  }

  // ============================================
  // LEAD ENRICHMENT
  // ============================================

  private async enrichLead(params: { leadId: string }): Promise<AgentResult> {
    const charged = await this.chargeCredits("enrich", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Trigger async enrichment job
    await inngest.send({
      name: AgentEvents["leads/enrich.requested"],
      data: {
        orgId: this.orgId,
        leadId: params.leadId,
      },
    });

    return {
      success: true,
      data: { message: "Enrichment job queued", leadId: params.leadId },
      creditsUsed: 2,
    };
  }

  // ============================================
  // LEAD SCORING
  // ============================================

  private async scoreLeads(params: {
    campaignId: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("score", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Get unscored leads from campaign
    const { data: leads, error } = await (this.db as any)
      .from("lead_contacts")
      .select("*, contacts(*)")
      .eq("campaign_id", params.campaignId)
      .eq("lead_score", 0);

    if (error) {
      return { success: false, error: "leads/fetch_failed" };
    }

    const ai = getOpenAI();
    const scoringPrompt = this.buildScoringPrompt(leads);

    try {
      const result = await ai.complete(scoringPrompt, {
        model: "gemini-3-flash",
        temperature: 0.3,
      });

      const scores = JSON.parse(result.content);

      // Update lead scores in database
      for (const scoreData of scores) {
        await (this.db as any)
          .from("lead_contacts")
          .update({
            lead_score: scoreData.score,
            score_breakdown: scoreData.breakdown,
            qualification_status: scoreData.score >= 70 ? "mql" : "unqualified",
          })
          .eq("id", scoreData.leadId);
      }

      await this.emit("leads/score.completed", {
        campaignId: params.campaignId,
        leadsScored: leads.length,
      });

      return {
        success: true,
        data: { leadsScored: leads.length, scores },
        creditsUsed: 1,
      };
    } catch (err) {
      await this.log("error", "Scoring failed", { error: err });
      return { success: false, error: "leads/scoring_failed" };
    }
  }

  private buildScoringPrompt(
    leads: Array<LeadContact & { contacts: Contact }>
  ): string {
    const icp = this.config.idealCustomerProfile || {};
    const weights = this.config.scoringWeights || {
      title_match: 30,
      company_size: 25,
      industry: 25,
      engagement: 20,
    };

    return `Score the following leads based on this Ideal Customer Profile:
${JSON.stringify(icp, null, 2)}

Scoring weights: ${JSON.stringify(weights)}

Leads to score:
${JSON.stringify(
  leads.map((l) => ({
    leadId: l.id,
    name: l.contacts?.full_name,
    email: l.contacts?.email,
    title: l.contacts?.job_title,
    company: l.enrichment_data,
  })),
  null,
  2
)}

Return a JSON array with format:
[{ "leadId": "...", "score": 0-100, "breakdown": { "title_match": 0-30, ... }, "reasoning": "..." }]`;
  }

  // ============================================
  // OUTREACH
  // ============================================

  private async sendOutreach(params: {
    leadId: string;
    sequenceId: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("outreach", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    await inngest.send({
      name: AgentEvents["leads/outreach.scheduled"],
      data: {
        orgId: this.orgId,
        leadId: params.leadId,
        sequenceId: params.sequenceId,
      },
    });

    return {
      success: true,
      data: { message: "Outreach scheduled", leadId: params.leadId },
      creditsUsed: 3,
    };
  }
}
