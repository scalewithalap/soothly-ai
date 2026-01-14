/**
 * Partnership Agent
 * Automates partner discovery, qualification, and outreach
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, CreditCost } from "../base/types";
import { getOpenAI } from "@/lib/ai";
import { inngest, AgentEvents } from "@/inngest/client";

export class PartnershipAgent extends BaseAgent {
  readonly name = "partners" as const;
  readonly displayName = "Partnerships";
  readonly description =
    "Discover and recruit affiliates and integration partners.";

  readonly creditCost: CreditCost = {
    discover: 2,
    qualify: 1,
    outreach: 3,
  };

  private config: {
    partnerCriteria?: Record<string, unknown>;
    commissionStructure?: Record<string, unknown>;
    outreachTemplates?: Record<string, string>;
  } = {};

  async initialize(): Promise<void> {
    this.config = (await this.getConfig()) as typeof this.config;
    await this.log("info", "PartnershipAgent initialized", {
      orgId: this.orgId,
    });
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      return { success: false, error: "agent/disabled" };
    }

    switch (task.action) {
      case "discover_partners":
        return this.discoverPartners(
          task.params as {
            industry?: string;
            partnerType?: string;
          }
        );
      case "qualify_partner":
        return this.qualifyPartner(task.params as { partnerId: string });
      case "send_outreach":
        return this.sendOutreach(
          task.params as {
            partnerId: string;
            templateId?: string;
          }
        );
      case "create_partner":
        return this.createPartner(
          task.params as {
            name: string;
            type: string;
            contactEmail: string;
          }
        );
      default:
        return { success: false, error: "agent/unknown_action" };
    }
  }

  async cleanup(): Promise<void> {
    await this.log("info", "PartnershipAgent cleanup completed");
  }

  // ============================================
  // PARTNER CREATION
  // ============================================

  private async createPartner(params: {
    name: string;
    type: string;
    contactEmail: string;
  }): Promise<AgentResult> {
    const { data, error } = await (this.db as any)
      .from("partners")
      .insert({
        org_id: this.orgId,
        name: params.name,
        type: params.type,
        primary_contact_email: params.contactEmail,
        status: "prospect",
      })
      .select()
      .single();

    if (error) {
      await this.log("error", "Failed to create partner", { error });
      return { success: false, error: "partners/create_failed" };
    }

    return { success: true, data };
  }

  // ============================================
  // PARTNER DISCOVERY
  // ============================================

  private async discoverPartners(params: {
    industry?: string;
    partnerType?: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("discover", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Trigger async discovery job
    await inngest.send({
      name: AgentEvents["partners/discover.requested"],
      data: {
        orgId: this.orgId,
        industry: params.industry,
        partnerType: params.partnerType || "affiliate",
        criteria: this.config.partnerCriteria,
      },
    });

    return {
      success: true,
      data: { message: "Partner discovery job queued" },
      creditsUsed: 2,
    };
  }

  // ============================================
  // PARTNER QUALIFICATION
  // ============================================

  private async qualifyPartner(params: {
    partnerId: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("qualify", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Get partner details
    const { data: partner, error } = await (this.db as any)
      .from("partners")
      .select("*, companies(*)")
      .eq("id", params.partnerId)
      .single();

    if (error || !partner) {
      return { success: false, error: "partners/not_found" };
    }

    const ai = getOpenAI();
    const criteria = this.config.partnerCriteria || {};

    try {
      const result = await ai.complete(
        `Evaluate this potential partner for fit with our program:

Partner: ${partner.name}
Type: ${partner.type}
Company Info: ${JSON.stringify(partner.companies || {}, null, 2)}

Our Partner Criteria:
${JSON.stringify(criteria, null, 2)}

Evaluate on:
1. Audience overlap (0-100)
2. Product/service fit (0-100)
3. Brand alignment (0-100)
4. Market reach (0-100)
5. Overall fit score (0-100)

Return as JSON:
{
  "fit_score": 85,
  "breakdown": {
    "audience_overlap": 90,
    "product_fit": 80,
    "brand_alignment": 85,
    "market_reach": 75
  },
  "strengths": ["...", "..."],
  "concerns": ["...", "..."],
  "recommendation": "proceed" | "maybe" | "pass",
  "reasoning": "..."
}`,
        { model: "gpt-4o-mini", temperature: 0.3 }
      );

      const qualification = JSON.parse(result.content);

      // Update partner with qualification data
      await (this.db as any)
        .from("partners")
        .update({
          fit_score: qualification.fit_score,
          fit_breakdown: qualification.breakdown,
          status:
            qualification.recommendation === "proceed"
              ? "contacted"
              : "prospect",
        })
        .eq("id", params.partnerId);

      await this.emit("partners/qualified", {
        partnerId: params.partnerId,
        fitScore: qualification.fit_score,
        recommendation: qualification.recommendation,
      });

      return {
        success: true,
        data: qualification,
        creditsUsed: 1,
      };
    } catch (err) {
      await this.log("error", "Partner qualification failed", { error: err });
      return { success: false, error: "partners/qualification_failed" };
    }
  }

  // ============================================
  // PARTNER OUTREACH
  // ============================================

  private async sendOutreach(params: {
    partnerId: string;
    templateId?: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("outreach", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Get partner
    const { data: partner, error } = await (this.db as any)
      .from("partners")
      .select()
      .eq("id", params.partnerId)
      .single();

    if (error || !partner) {
      return { success: false, error: "partners/not_found" };
    }

    if (!partner.primary_contact_email) {
      return { success: false, error: "partners/no_contact_email" };
    }

    const ai = getOpenAI();

    try {
      // Generate personalized outreach
      const result = await ai.complete(
        `Write a personalized partnership outreach email for:

Partner: ${partner.name}
Type: ${partner.type}
Fit Score: ${partner.fit_score || "Unknown"}
Contact: ${partner.primary_contact_name || "Partner"}

Our Value Proposition:
- Multi-agent AI platform for business automation
- Competitive commission rates
- High conversion rates
- Dedicated partner support

Write a concise, professional email that:
1. Opens with something specific about their business
2. Explains the partnership opportunity
3. Highlights mutual benefits
4. Has a clear call-to-action

Return as JSON:
{
  "subject": "...",
  "body": "..."
}`,
        { model: "gpt-4o-mini", temperature: 0.7 }
      );

      const email = JSON.parse(result.content);

      // Create outreach record
      const { data: outreach, error: outreachError } = await (this.db as any)
        .from("partner_outreach")
        .insert({
          org_id: this.orgId,
          partner_id: params.partnerId,
          type: "email",
          subject: email.subject,
          content: email.body,
          status: "pending",
          scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (outreachError) {
        return { success: false, error: "partners/outreach_create_failed" };
      }

      // Trigger async email sending
      await inngest.send({
        name: AgentEvents["partners/outreach.scheduled"],
        data: {
          orgId: this.orgId,
          partnerId: params.partnerId,
          outreachId: outreach.id,
          email: partner.primary_contact_email,
          subject: email.subject,
          body: email.body,
        },
      });

      return {
        success: true,
        data: { outreachId: outreach.id, email },
        creditsUsed: 3,
      };
    } catch (err) {
      await this.log("error", "Partner outreach failed", { error: err });
      return { success: false, error: "partners/outreach_failed" };
    }
  }
}
