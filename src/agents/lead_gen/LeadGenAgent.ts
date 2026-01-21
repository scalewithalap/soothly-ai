/**
 * Lead Generation Agent
 * Automates lead discovery, enrichment, scoring, and outreach
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { getGemini } from "@/lib/ai";
import { inngest } from "@/inngest/client";
import { LEAD_EVENTS } from "@/inngest/events";
import type { Database } from "@/types/database";

// Type aliases for database tables
type LeadContact = Database["public"]["Tables"]["lead_contacts"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export class LeadGenAgent extends BaseAgent {
  readonly name = "lead_gen" as const;
  readonly displayName = "Lead Generation";
  readonly description =
    "Automatically find, enrich, and reach out to your ideal customers.";

  readonly usageCost: UsageCost = {
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
          task.params as { name: string; criteria: Record<string, unknown> },
        );
      case "scrape_leads":
        return this.scrapeLeads(
          task.params as { campaignId: string; source: string },
        );
      case "enrich_lead":
        return this.enrichLead(task.params as { leadId: string });
      case "score_leads":
        return this.scoreLeads(task.params as { campaignId: string });
      case "send_outreach":
        return this.sendOutreach(
          task.params as { leadId: string; sequenceId: string },
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
    const charged = await this.consumeUsage("scrape", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
    }

    // Trigger async scraping job via Inngest
    await inngest.send({
      name: LEAD_EVENTS.SCRAPE_REQUESTED,
      data: {
        orgId: this.orgId,
        campaignId: params.campaignId,
        source: params.source,
      },
    });

    return {
      success: true,
      data: { message: "Scraping job queued", campaignId: params.campaignId },
      usageCount: 1,
    };
  }

  // ============================================
  // LEAD ENRICHMENT
  // ============================================

  private async enrichLead(params: { leadId: string }): Promise<AgentResult> {
    const charged = await this.consumeUsage("enrich", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
    }

    // Trigger async enrichment job
    await inngest.send({
      name: LEAD_EVENTS.ENRICH_REQUESTED,
      data: {
        orgId: this.orgId,
        leadId: params.leadId,
      },
    });

    return {
      success: true,
      data: { message: "Enrichment job queued", leadId: params.leadId },
      usageCount: 2,
    };
  }

  // ============================================
  // LEAD SCORING
  // ============================================

  private async scoreLeads(params: {
    campaignId: string;
  }): Promise<AgentResult> {
    const charged = await this.consumeUsage("score", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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

    const ai = getGemini();
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
        usageCount: 1,
      };
    } catch (err) {
      await this.log("error", "Scoring failed", { error: err });
      return { success: false, error: "leads/scoring_failed" };
    }
  }

  private buildScoringPrompt(
    leads: Array<LeadContact & { contacts: Contact }>,
  ): string {
    const icp = this.config.idealCustomerProfile || {};
    const weights = this.config.scoringWeights || {
      title_match: 30,
      company_size: 25,
      industry: 25,
      engagement: 20,
    };

    return `You are an expert B2B lead qualification specialist and SDR strategist. Score and qualify the following leads with precision.

## IDEAL CUSTOMER PROFILE (ICP)
${JSON.stringify(icp, null, 2)}

## SCORING WEIGHTS
${JSON.stringify(weights, null, 2)}

## LEADS TO EVALUATE
${JSON.stringify(
  leads.map((l) => ({
    leadId: l.id,
    name: l.contacts?.full_name,
    email: l.contacts?.email,
    title: l.contacts?.job_title,
    company: l.enrichment_data,
  })),
  null,
  2,
)}

## SCORING METHODOLOGY

### 1. TITLE MATCH (0-${weights.title_match} points)
Evaluate job title alignment with decision-making authority:
- C-Level/VP/Director titles = Full points
- Manager/Lead titles = 70% points
- Individual contributors = 30% points
- Unrelated titles = 0 points

### 2. COMPANY SIZE (0-${weights.company_size} points)
Match against ICP company size:
- Perfect match = Full points
- Adjacent segment = 70% points
- Too small/large = 30% points

### 3. INDUSTRY FIT (0-${weights.industry} points)
Evaluate industry alignment:
- Exact industry match = Full points
- Related industry = 70% points
- Neutral industry = 40% points
- Excluded industry = 0 points

### 4. ENGAGEMENT SIGNALS (0-${weights.engagement} points)
Consider available engagement data:
- Recent activity signals = Bonus points
- Email domain quality (corporate vs free) = Factor
- LinkedIn profile completeness = Factor

## EMAIL DELIVERABILITY CONTEXT
Consider email quality indicators:
- Corporate domain emails (company.com) = Higher priority
- Free email domains (gmail, yahoo) = Lower priority for B2B
- Role-based emails (info@, sales@) = Medium priority
- Note: Leads marked as "catch-all" or "bounce" should be flagged

## QUALIFICATION TIERS
Based on total score, assign qualification:
- 80-100: **MQL** (Marketing Qualified) - High priority, immediate outreach
- 60-79: **Nurture** - Good fit, needs warming
- 40-59: **Low Priority** - Possible fit, backlog
- 0-39: **Unqualified** - Poor fit, do not pursue

## OUTPUT FORMAT
Return ONLY valid JSON array (no markdown):
[{
  "leadId": "uuid-here",
  "score": 85,
  "breakdown": {
    "title_match": 28,
    "company_size": 22,
    "industry": 20,
    "engagement": 15
  },
  "qualification_tier": "mql",
  "email_quality": "corporate",
  "priority_rank": 1,
  "reasoning": "VP-level decision maker at mid-market SaaS company in target industry",
  "recommended_approach": "Direct outreach highlighting ROI case studies",
  "potential_objections": ["Budget timing", "Existing vendor relationship"]
}]`;
  }

  // ============================================
  // OUTREACH
  // ============================================

  private async sendOutreach(params: {
    leadId: string;
    sequenceId: string;
  }): Promise<AgentResult> {
    const charged = await this.consumeUsage("outreach", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
    }

    await inngest.send({
      name: LEAD_EVENTS.OUTREACH_SCHEDULED,
      data: {
        orgId: this.orgId,
        leadId: params.leadId,
        sequenceId: params.sequenceId,
      },
    });

    return {
      success: true,
      data: { message: "Outreach scheduled", leadId: params.leadId },
      usageCount: 3,
    };
  }
}
