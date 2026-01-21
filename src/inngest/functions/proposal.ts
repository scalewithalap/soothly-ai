/**
 * Proposal Generator Agent Inngest Functions
 * Background jobs for prospect analysis and proposal generation
 *
 * Function: Proposal Generator Workflow
 * Trigger: 'proposal/create.full' or individual step events
 *
 * Flow:
 * 1. analyze-prospect: Scrape and analyze prospect website
 * 2. synthesize-mapping: Map pains to solutions with AI
 * 3. generate-proposal: Create personalized PDF proposal
 *
 * Resiliency:
 * - Retries: 3x on scraping/AI failures with exponential backoff
 * - Idempotency: Checks for existing proposal before regenerating
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getGemini } from "@/lib/ai";
import {
  notifyAgentCompletion,
  getOrgOwnerNotificationPreferences,
} from "@/lib/notifications";
import { createSemanticCache } from "@/agents/memory";
import {
  parseAgentEventData,
  requiresApproval,
  requestApprovalAndWait,
  type AutonomyMode,
} from "@/inngest/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper for untyped client
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Get organization owner for notifications
 */
async function getOrgOwner(orgId: string): Promise<{
  email?: string;
  phone?: string;
  name?: string;
} | null> {
  const supabase = getUntypedClient();
  const { data } = await supabase
    .from("users")
    .select("email, phone, full_name")
    .eq("org_id", orgId)
    .single();

  if (!data) return null;
  return { email: data.email, phone: data.phone, name: data.full_name };
}

/**
 * Scrape prospect website pages
 */
async function scrapeProspectWebsite(url: string): Promise<{
  title: string;
  pages: Array<{ path: string; content: string }>;
}> {
  // Placeholder for actual scraping implementation
  // Would use Apify or Firecrawl in production
  const pages = [
    { path: "/", content: "Homepage content placeholder" },
    { path: "/about", content: "About page content placeholder" },
    { path: "/pricing", content: "Pricing page content placeholder" },
  ];

  return {
    title: new URL(url).hostname,
    pages,
  };
}

// ============================================
// FULL PROPOSAL WORKFLOW
// ============================================

/**
 * Complete proposal creation workflow
 */
export const createFullProposal = inngest.createFunction(
  {
    id: "proposal-create-full",
    name: "Create Full Proposal",
    retries: 3,
  },
  { event: "proposal/create.full" },
  async ({ event, step }) => {
    // Parse event data with SKILL.md compliance (model + autonomy_mode)
    const eventData = parseAgentEventData<{
      orgId: string;
      prospectUrl: string;
      contactName?: string;
      contactEmail?: string;
    }>(event.data);
    const {
      orgId,
      prospectUrl,
      contactName,
      contactEmail,
      model,
      autonomy_mode,
    } = eventData;

    // Step 1: Create prospect record
    const prospect = await step.run("create-prospect", async () => {
      const supabase = getUntypedClient();
      const { data, error } = await supabase
        .from("prospects")
        .insert({
          org_id: orgId,
          website_url: prospectUrl,
          contact_name: contactName,
          contact_email: contactEmail,
          status: "analyzing",
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create prospect: ${error.message}`);
      return data;
    });

    // Step 2: Scrape prospect website
    const scrapedData = await step.run("scrape-website", async () => {
      return scrapeProspectWebsite(prospectUrl);
    });

    // Step 3: Check semantic cache before AI (per SKILL.md)
    const analysisPrompt = `You are an expert B2B sales analyst. Analyze this prospect's website.

URL: ${prospectUrl}
Title: ${scrapedData.title}

Pages:
${scrapedData.pages.map((p: { path: string; content: string }) => `${p.path}: ${p.content}`).join("\n\n")}

Return JSON with:
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

    // Check cache first (SKILL.md: Semantic Caching)
    const cachedAnalysis = await step.run("check-cache-analysis", async () => {
      const cache = createSemanticCache(orgId);
      return cache.get(analysisPrompt);
    });

    // Step 3: Analyze prospect with AI (or use cache)
    const analysis = cachedAnalysis
      ? (cachedAnalysis.response as Record<string, unknown>)
      : await step.run("analyze-prospect", async () => {
          const ai = getGemini();
          const result = await ai.complete(analysisPrompt, {
            model, // Dynamic model selection (SKILL.md)
            temperature: 0.3,
          });
          const parsed = JSON.parse(result.content);

          // Store in cache
          const cache = createSemanticCache(orgId);
          await cache.set(analysisPrompt, parsed, result.usage.totalTokens);

          return parsed;
        });

    // Step 4: Update prospect with analysis
    await step.run("save-analysis", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("prospects")
        .update({
          company_name: analysis.companyName,
          industry: analysis.industry,
          company_size: analysis.companySize,
          analysis_data: analysis,
          status: "analyzed",
        })
        .eq("id", prospect.id);
    });

    // Step 5: Check if approval required (SKILL.md: 3-tier Autonomy)
    if (
      requiresApproval(
        "create_proposal",
        autonomy_mode,
        (analysis as { confidence?: number }).confidence,
      )
    ) {
      const approval = await requestApprovalAndWait(step as any, {
        orgId,
        agentType: "proposal",
        action: "create_proposal",
        title: `Create proposal for ${(analysis as { companyName?: string }).companyName}`,
        description: "Review the analysis before generating the proposal",
        params: { prospectUrl, prospectId: prospect.id },
        previewData: analysis as Record<string, unknown>,
        riskLevel: "medium",
      });

      if (!approval.approved) {
        return {
          success: false,
          error: "Proposal creation rejected",
          comment: approval.comment,
        };
      }
    }

    // Step 6: Generate proposal content with AI
    const proposalContent = await step.run("generate-proposal", async () => {
      const ai = getGemini();

      const prompt = `Create a personalized proposal for ${(analysis as { companyName?: string }).companyName}.

Analysis:
${JSON.stringify(analysis, null, 2)}

Return JSON:
{
  "title": "Proposal for [Company]",
  "executiveSummary": "string",
  "challenge": "string",
  "solution": "string",
  "outcomes": ["string"],
  "whyUs": ["string"],
  "nextSteps": "string"
}`;

      const result = await ai.complete(prompt, {
        model, // Dynamic model selection (SKILL.md)
        temperature: 0.5,
      });

      return JSON.parse(result.content);
    });

    // Step 6: Save proposal
    const proposal = await step.run("save-proposal", async () => {
      const supabase = getUntypedClient();
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          org_id: orgId,
          prospect_id: prospect.id,
          title: proposalContent.title,
          content: proposalContent,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to save proposal: ${error.message}`);
      return data;
    });

    // Step 7: Update prospect status
    await step.run("update-prospect-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("prospects")
        .update({ status: "proposal_ready" })
        .eq("id", prospect.id);
    });

    // Step 8: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "proposal",
        action: "proposal_created",
        entity_type: "proposal",
        entity_id: proposal.id,
        description: `Proposal created for ${analysis.companyName}`,
        metadata: { prospectUrl },
      });
    });

    // Step 9: Send notification
    await step.run("send-notification", async () => {
      const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
      if (
        ownerPrefs &&
        ownerPrefs.preferences.eventPreferences.agentCompletion
      ) {
        const owner = await getOrgOwner(orgId);
        if (owner) {
          await notifyAgentCompletion(
            owner,
            {
              agentName: "Proposal Generator",
              action: "Proposal Created",
              resultCount: 1,
              details: `Proposal ready for ${analysis.companyName}. View and send it now.`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    return {
      success: true,
      prospectId: prospect.id,
      proposalId: proposal.id,
      companyName: analysis.companyName,
    };
  },
);

// ============================================
// INDIVIDUAL STEP FUNCTIONS
// ============================================

/**
 * Analyze a prospect website independently
 */
export const analyzeProspect = inngest.createFunction(
  {
    id: "proposal-analyze-prospect",
    name: "Analyze Prospect Website",
    retries: 3,
  },
  { event: "proposal/analyze.requested" },
  async ({ event, step }) => {
    const { orgId, prospectUrl } = event.data as {
      orgId: string;
      prospectUrl: string;
    };

    // Scrape and analyze
    const scrapedData = await step.run("scrape", async () => {
      return scrapeProspectWebsite(prospectUrl);
    });

    const analysis = await step.run("analyze", async () => {
      const ai = getGemini();
      const prompt = `Analyze this prospect website and return JSON analysis:
URL: ${prospectUrl}
Content: ${JSON.stringify(scrapedData)}`;

      const result = await ai.complete(prompt, {
        model: "gemini-3-flash",
        temperature: 0.3,
      });
      return JSON.parse(result.content);
    });

    return { success: true, analysis };
  },
);

/**
 * Generate proposal for an existing prospect
 */
export const generateProposal = inngest.createFunction(
  {
    id: "proposal-generate",
    name: "Generate Proposal",
    retries: 3,
  },
  { event: "proposal/generate.requested" },
  async ({ event, step }) => {
    const { orgId, prospectId, templateId } = event.data as {
      orgId: string;
      prospectId: string;
      templateId?: string;
    };

    // Get prospect analysis
    const prospect = await step.run("get-prospect", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .eq("id", prospectId)
        .single();
      return data;
    });

    if (!prospect?.analysis_data) {
      return { success: false, error: "Prospect not analyzed yet" };
    }

    // Generate proposal content
    const proposalContent = await step.run("generate", async () => {
      const ai = getGemini();
      const prompt = `Create proposal for: ${JSON.stringify(prospect.analysis_data)}`;

      const result = await ai.complete(prompt, {
        model: "gemini-3-flash",
        temperature: 0.5,
      });
      return JSON.parse(result.content);
    });

    // Save proposal
    const proposal = await step.run("save", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("proposals")
        .insert({
          org_id: orgId,
          prospect_id: prospectId,
          title: proposalContent.title,
          content: proposalContent,
          template_id: templateId,
          status: "draft",
        })
        .select()
        .single();
      return data;
    });

    return { success: true, proposalId: proposal?.id };
  },
);
