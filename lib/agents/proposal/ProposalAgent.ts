/**
 * Proposal Generator Agent
 * Creates personalized proposals by analyzing prospect websites
 *
 * Role: "The Closer" - Your Deal Desk / Sales Engineer
 * Trigger: Webhook (form_submission) with prospect_url
 *
 * Flow:
 * 1. Analyze Step: Multi-page scrape of prospect URL
 * 2. Synthesize Step: Map prospect pains to our solutions
 * 3. Generate Step: Create PDF proposal with personalized content
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { inngest, AgentEvents } from "@/inngest/client";

export class ProposalAgent extends BaseAgent {
  readonly name = "proposal" as const;
  readonly displayName = "Proposal Generator";
  readonly description =
    "Create personalized proposals by analyzing prospect websites.";

  readonly usageCost: UsageCost = {
    analyze: 2,
    synthesize: 2,
    generate: 3,
  };

  private config: {
    companyInfo?: Record<string, unknown>;
    branding?: Record<string, unknown>;
    defaultTemplateId?: string;
  } = {};

  async initialize(): Promise<void> {
    this.config = (await this.getConfig()) as typeof this.config;
    await this.log("info", "ProposalAgent initialized", { orgId: this.orgId });
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      return { success: false, error: "agent/disabled" };
    }

    switch (task.action) {
      case "analyze_prospect":
        return this.analyzeProspect(task.params as { prospectUrl: string });
      case "generate_proposal":
        return this.generateProposal(
          task.params as {
            prospectId: string;
            templateId?: string;
          },
        );
      case "create_full":
        return this.createFullProposal(
          task.params as {
            prospectUrl: string;
            contactName?: string;
            contactEmail?: string;
          },
        );
      default:
        return { success: false, error: "agent/unknown_action" };
    }
  }

  async cleanup(): Promise<void> {
    await this.log("info", "ProposalAgent cleanup completed");
  }

  // ============================================
  // PROSPECT ANALYSIS
  // ============================================

  private async analyzeProspect(params: {
    prospectUrl: string;
  }): Promise<AgentResult> {
    const charged = await this.consumeUsage("analyze", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
    }

    // Trigger async analysis job via Inngest
    await inngest.send({
      name: AgentEvents["proposal/analyze.requested"],
      data: {
        orgId: this.orgId,
        prospectUrl: params.prospectUrl,
      },
    });

    return {
      success: true,
      data: { message: "Analysis job queued", url: params.prospectUrl },
      usageCount: 2,
    };
  }

  // ============================================
  // PROPOSAL GENERATION
  // ============================================

  private async generateProposal(params: {
    prospectId: string;
    templateId?: string;
  }): Promise<AgentResult> {
    const charged = await this.consumeUsage("generate", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
    }

    // Trigger async generation job
    await inngest.send({
      name: AgentEvents["proposal/generate.requested"],
      data: {
        orgId: this.orgId,
        prospectId: params.prospectId,
        templateId: params.templateId || this.config.defaultTemplateId,
      },
    });

    return {
      success: true,
      data: { message: "Generation job queued", prospectId: params.prospectId },
      usageCount: 3,
    };
  }

  // ============================================
  // FULL PROPOSAL WORKFLOW (Combined)
  // ============================================

  private async createFullProposal(params: {
    prospectUrl: string;
    contactName?: string;
    contactEmail?: string;
  }): Promise<AgentResult> {
    // Check for sufficient usage for full workflow
    const hasUsage = await this.hasEnoughUsage("analyze", 1);
    if (!hasUsage) {
      return { success: false, error: "usage/limit_exceeded" };
    }

    // Trigger the full proposal workflow
    await inngest.send({
      name: AgentEvents["proposal/create.full"],
      data: {
        orgId: this.orgId,
        prospectUrl: params.prospectUrl,
        contactName: params.contactName,
        contactEmail: params.contactEmail,
      },
    });

    return {
      success: true,
      data: {
        message: "Full proposal workflow started",
        url: params.prospectUrl,
      },
      usageCount: 7, // analyze (2) + synthesize (2) + generate (3)
    };
  }

  // ============================================
  // PROMPT BUILDING
  // ============================================

  buildAnalysisPrompt(scrapedContent: {
    url: string;
    title: string;
    pages: Array<{ path: string; content: string }>;
  }): string {
    return `You are an expert B2B sales analyst. Analyze this prospect's website to understand their business, pain points, and how our solutions might help them.

## PROSPECT WEBSITE
URL: ${scrapedContent.url}
Title: ${scrapedContent.title}

## SCRAPED PAGES
${scrapedContent.pages
  .map(
    (p) => `### ${p.path}
${p.content.slice(0, 3000)}`,
  )
  .join("\n\n")}

## ANALYSIS REQUIRED

### 1. Company Overview
- Company name and what they do
- Industry and target market
- Size estimation (startup/SMB/enterprise)
- Key differentiators

### 2. Identified Pain Points
Based on their messaging, what problems are they likely facing?
- Operational challenges
- Growth bottlenecks
- Technology gaps

### 3. Value Proposition Mapping
How could our solutions address their needs?
Map their pains to specific benefits.

### 4. Proposal Angle
What messaging would resonate most?
- Primary hook/headline
- Key benefits to emphasize
- Potential objections to address

## OUTPUT FORMAT
Return valid JSON:
{
  "companyName": "string",
  "industry": "string",
  "companySize": "startup|smb|mid-market|enterprise",
  "description": "string",
  "painPoints": ["string"],
  "valuePropositions": [{"pain": "string", "solution": "string", "benefit": "string"}],
  "proposalAngle": {
    "headline": "string",
    "keyBenefits": ["string"],
    "objections": ["string"]
  },
  "confidence": 0.0-1.0
}`;
  }

  buildProposalPrompt(analysis: {
    companyName: string;
    industry: string;
    painPoints: string[];
    valuePropositions: Array<{
      pain: string;
      solution: string;
      benefit: string;
    }>;
    proposalAngle: {
      headline: string;
      keyBenefits: string[];
    };
  }): string {
    const companyInfo = this.config.companyInfo || {};

    return `You are a professional proposal writer. Create a compelling, personalized proposal for this prospect.

## OUR COMPANY
${JSON.stringify(companyInfo, null, 2)}

## PROSPECT ANALYSIS
Company: ${analysis.companyName}
Industry: ${analysis.industry}

Pain Points:
${analysis.painPoints.map((p) => `- ${p}`).join("\n")}

Value Propositions:
${analysis.valuePropositions.map((v) => `- Pain: ${v.pain} → Solution: ${v.solution} → Benefit: ${v.benefit}`).join("\n")}

Recommended Angle:
Headline: ${analysis.proposalAngle.headline}
Key Benefits: ${analysis.proposalAngle.keyBenefits.join(", ")}

## PROPOSAL STRUCTURE

### 1. Executive Summary (2-3 sentences)
Hook them immediately with understanding of their situation.

### 2. The Challenge
Validate their pain points professionally.

### 3. Our Solution
Map our capabilities to their specific needs.

### 4. Expected Outcomes
Quantifiable benefits where possible.

### 5. Why Us
Differentiators relevant to their industry.

### 6. Next Steps
Clear call-to-action.

## OUTPUT FORMAT
Return valid JSON:
{
  "title": "Proposal for [Company]",
  "executiveSummary": "string",
  "challenge": "string",
  "solution": "string",
  "outcomes": ["string"],
  "whyUs": ["string"],
  "nextSteps": "string",
  "estimatedValue": "string (optional)"
}`;
  }
}
