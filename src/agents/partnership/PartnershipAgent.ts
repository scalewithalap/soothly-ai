/**
 * Partnership Agent
 * Automates partner discovery, qualification, and outreach
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { getGemini } from "@/lib/ai";
import { inngest, AgentEvents } from "@/inngest/client";

export class PartnershipAgent extends BaseAgent {
  readonly name = "partnership" as const;
  readonly displayName = "Partnerships";
  readonly description =
    "Discover and recruit affiliates and integration partners.";

  readonly usageCost: UsageCost = {
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
          },
        );
      case "qualify_partner":
        return this.qualifyPartner(task.params as { partnerId: string });
      case "send_outreach":
        return this.sendOutreach(
          task.params as {
            partnerId: string;
            templateId?: string;
          },
        );
      case "create_partner":
        return this.createPartner(
          task.params as {
            name: string;
            type: string;
            contactEmail: string;
          },
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
    const charged = await this.consumeUsage("discover", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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
      usageCount: 2,
    };
  }

  // ============================================
  // PARTNER QUALIFICATION
  // ============================================

  private async qualifyPartner(params: {
    partnerId: string;
  }): Promise<AgentResult> {
    const charged = await this.consumeUsage("qualify", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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

    const ai = getGemini();
    const criteria = this.config.partnerCriteria || {};

    try {
      const result = await ai.complete(
        `You are an expert affiliate manager and influencer partnership strategist. Evaluate this potential partner for fit with our program.

## PARTNER PROFILE
**Name:** ${partner.name}
**Type:** ${partner.type}
**Company/Profile Data:** ${JSON.stringify(partner.companies || {}, null, 2)}

## OUR PARTNER CRITERIA
${JSON.stringify(criteria, null, 2)}

## EVALUATION FRAMEWORK

### 1. AUDIENCE ANALYSIS (0-100 points)
**Audience Overlap Score:**
- Target demographic match (age, interests, profession)
- Geographic alignment with our markets
- Purchasing power indicators
- Engagement quality (real humans vs bots)

**Engagement Rate Calculation:**
- Formula: (avg_likes + avg_comments) / followers * 100
- Minimum threshold: > 1% for micro-influencers, > 0.5% for macro
- Red flag: < 0.5% suggests fake/disengaged followers

### 2. PRODUCT/SERVICE FIT (0-100 points)
- How naturally does our product fit their content?
- Have they promoted similar products before?
- Would promotion feel authentic or forced?
- Cross-sell/upsell potential

### 3. BRAND ALIGNMENT (0-100 points)
- Values alignment with our brand
- Content tone and quality
- Visual aesthetic compatibility
- Reputation and trust signals

### 4. MARKET REACH (0-100 points)
- Follower count relative to niche
- Multi-platform presence
- Content virality potential
- Email list or owned audience indicators

### 5. SAFETY & RISK ASSESSMENT
**Red Flags to Check:**
- NSFW content in recent posts or bio
- Controversial statements or affiliations
- Fake follower indicators (sudden spikes, low engagement)
- Previous partnership issues or complaints
- Inactive account (last post > 7 days ago)

## PARTNERSHIP TIER RECOMMENDATION
Based on evaluation, recommend tier:
- **Tier 1 (Premium)**: 30% commission, co-marketing, featured placement
- **Tier 2 (Standard)**: 25% commission, standard affiliate benefits
- **Tier 3 (Starter)**: 20% commission, basic affiliate access
- **Pass**: Do not pursue partnership

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown):
{
  "fit_score": 85,
  "breakdown": {
    "audience_overlap": 90,
    "product_fit": 80,
    "brand_alignment": 85,
    "market_reach": 75
  },
  "engagement_rate": {
    "calculated_rate": 2.5,
    "assessment": "healthy",
    "fraud_risk": "low"
  },
  "safety_check": {
    "passed": true,
    "flags": [],
    "risk_level": "low"
  },
  "strengths": ["Highly engaged niche audience", "Authentic content style"],
  "concerns": ["Limited multi-platform presence"],
  "partnership_tier": "tier_2",
  "recommended_commission": 25,
  "recommendation": "proceed",
  "reasoning": "Strong audience match with healthy engagement metrics",
  "onboarding_notes": "Suggest starting with product review before affiliate"
}`,
        { model: "gemini-3-flash", temperature: 0.3 },
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
        usageCount: 1,
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
    const charged = await this.consumeUsage("outreach", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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

    const ai = getGemini();

    try {
      // Generate personalized outreach
      const result = await ai.complete(
        `You are an expert partnership outreach copywriter. Write a highly personalized partnership invitation email that will get a response.

## PARTNER DETAILS
**Name:** ${partner.name}
**Type:** ${partner.type}
**Fit Score:** ${partner.fit_score || "Not yet evaluated"}
**Contact Name:** ${partner.primary_contact_name || "Partner"}

## OUR VALUE PROPOSITION
**Product:** Zero Headache - Multi-agent AI platform for business automation
**Commission Structure:**
- Tier 1 Partners: 30% recurring commission
- Tier 2 Partners: 25% recurring commission
- Tier 3 Partners: 20% recurring commission
**Benefits for Partners:**
- High conversion rates (AI tools are in-demand)
- Recurring revenue (subscription model)
- Dedicated partner success manager
- Co-marketing opportunities
- Early access to new features
- Custom landing pages and tracking

## EMAIL WRITING GUIDELINES

### SUBJECT LINE REQUIREMENTS
- Personalized (include partner name or niche reference)
- Creates curiosity without being clickbait
- Under 50 characters for mobile optimization
- Avoid spam trigger words (free, limited time, etc.)

### BODY STRUCTURE
1. **Opening Hook (1-2 sentences)**
   - Reference something SPECIFIC about their content/business
   - Show you've done your homework
   - NO generic compliments ("love your work")

2. **Bridge (1 sentence)**
   - Why you're reaching out NOW
   - Connection between their audience and our product

3. **Value Proposition (2-3 sentences)**
   - What's in it for THEM (revenue, value for audience)
   - Social proof if relevant (other partners, stats)
   - Commission rate mention (30% for premium partners)

4. **Call-to-Action (1 sentence)**
   - Specific next step (15-min call, reply, click link)
   - Low friction ask
   - Time-specific if possible

5. **Sign-off**
   - Professional but warm
   - Include full name and title

### TONE GUIDELINES
- Professional yet conversational
- Confident but not pushy
- Personalized, not templated
- Value-focused, not pitch-heavy

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown):
{
  "subject": "Personalized 50-char subject line",
  "preview_text": "First 90 chars that appear in email preview",
  "body": "Full email body with proper line breaks",
  "personalization_hooks": ["list", "of", "specific", "references", "used"],
  "alternative_subject": "Backup subject line option",
  "follow_up_timing": "Recommended days until follow-up"
}`,
        { model: "gemini-3-flash", temperature: 0.7 },
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
        usageCount: 3,
      };
    } catch (err) {
      await this.log("error", "Partner outreach failed", { error: err });
      return { success: false, error: "partners/outreach_failed" };
    }
  }
}
