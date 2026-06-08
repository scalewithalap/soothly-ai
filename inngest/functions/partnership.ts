/**
 * Partnership Agent Functions
 * Background jobs for partner discovery and outreach using Apify LinkedIn scraping
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { discoverPartnersOnLinkedIn, getCompanyDetails } from "@/lib/apify";
import { getGemini } from "@/lib/ai";
import {
  notifyAgentCompletion,
  notifyAgentError,
  sendNotification,
  getOrgOwnerNotificationPreferences,
} from "@/lib/notifications";
import {
  parseAgentEventData,
  requiresApproval,
  requestApprovalAndWait,
} from "@/inngest/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper to work around typed client limitations
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

  return {
    email: data.email,
    phone: data.phone,
    name: data.full_name,
  };
}

/**
 * Discover potential partners based on criteria using LinkedIn
 */
export const discoverPartners = inngest.createFunction(
  {
    id: "partners-discover",
    name: "Discover Partners",
    throttle: {
      limit: 5,
      period: "1m",
    },
    triggers: [
      { event: "partners/discover.requested" }
    ]
  },
  async ({ event, step }) => {
    const {
      industry,
      orgId,
      partnerType,
      keywords,
      locations,
      companySize,
      maxResults,
    } = event.data as {
      industry: string;
      orgId: string;
      partnerType: string;
      keywords?: string[];
      locations?: string[];
      companySize?: string;
      maxResults?: number;
      criteria?: Record<string, unknown>;
    };

    // Step 1: Search for potential partners on LinkedIn
    const prospects = await step.run("search-prospects", async () => {
      try {
        const results = await discoverPartnersOnLinkedIn({
          industry,
          keywords,
          locations,
          companySize,
          maxResults: maxResults || 30,
        });
        return results;
      } catch (error) {
        console.error("Partner discovery error:", error);
        return [];
      }
    });

    // Step 2: Create partner records
    const createdCount = await step.run("create-partner-records", async () => {
      const supabase = getUntypedClient();
      let count = 0;

      for (const prospect of prospects) {
        const { error } = await supabase.from("partners").insert({
          org_id: orgId,
          name: prospect.name,
          type: partnerType,
          status: "prospect",
          tier: "standard",
          website: prospect.website,
          linkedin_url: prospect.linkedinUrl,
          fit_score: 0,
          fit_breakdown: {},
          terms: {},
          total_referrals: 0,
          total_revenue: 0,
          total_commissions_paid: 0,
          conversion_rate: 0,
          api_enabled: false,
          metadata: {
            source: "linkedin_discovery",
            industry: prospect.industry || industry,
            description: prospect.description,
            companySize: prospect.companySize,
            headquarters: prospect.headquarters,
            foundedYear: prospect.foundedYear,
            specialties: prospect.specialties,
          },
        });

        if (!error) count++;
      }

      return count;
    });

    // Step 3: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "partnership",
        action: "discovery_completed",
        entity_type: "partner",
        description: `Found ${createdCount} potential partners in ${industry}`,
        metadata: {
          industry,
          partnerType,
          totalFound: prospects.length,
          saved: createdCount,
        },
      });
    });

    // Step 4: Send notification with user preferences
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
              agentName: "Partnerships",
              action: "Partner Discovery",
              resultCount: createdCount,
              details: `Found ${createdCount} potential ${partnerType} partners in the ${industry} industry.`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    return { found: createdCount };
  },

);

/**
 * Qualify and score a partner using AI
 */
export const qualifyPartner = inngest.createFunction(
  {
    id: "partners-qualify",
    name: "Qualify Partner",
    triggers: [
      { event: "partners/qualify.requested" }
    ]
  },
  async ({ event, step }) => {
    const { partnerId, orgId, partnerCriteria } = event.data as {
      partnerId: string;
      orgId: string;
      partnerCriteria?: Record<string, unknown>;
    };

    // Step 1: Get partner details
    const partner = await step.run("get-partner", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerId)
        .single();
      return data;
    });

    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    // Step 2: Enrich with LinkedIn data if we have the URL
    const enrichedData = await step.run("enrich-partner", async () => {
      if (partner.linkedin_url) {
        try {
          const details = await getCompanyDetails(partner.linkedin_url);
          return details;
        } catch (error) {
          console.error("Enrichment failed:", error);
          return null;
        }
      }
      return null;
    });

    // Step 3: Calculate fit score using AI
    const fitScore = await step.run("calculate-fit-score", async () => {
      const ai = getGemini();
      const criteria = partnerCriteria || {};

      const partnerInfo = {
        name: partner.name,
        type: partner.type,
        website: partner.website,
        ...partner.metadata,
        ...enrichedData,
      };

      const result = await ai.complete(
        `Evaluate this potential partner for fit with our program:

Partner: ${partner.name}
Type: ${partner.type}
Company Info: ${JSON.stringify(partnerInfo, null, 2)}

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
  "recommendation": "proceed | maybe | pass",
  "reasoning": "..."
}`,
        { model: "gemini-3-flash", temperature: 0.3 },
      );

      try {
        return JSON.parse(result.content);
      } catch {
        return {
          fit_score: 50,
          breakdown: {
            audience_overlap: 50,
            product_fit: 50,
            brand_alignment: 50,
            market_reach: 50,
          },
          recommendation: "maybe",
        };
      }
    });

    // Step 4: Update partner with score and enriched data
    await step.run("update-partner-score", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("partners")
        .update({
          fit_score: fitScore.fit_score,
          fit_breakdown: fitScore.breakdown,
          status:
            fitScore.recommendation === "proceed" ? "contacted" : "prospect",
          metadata: {
            ...partner.metadata,
            ...(enrichedData || {}),
            qualificationResult: {
              strengths: fitScore.strengths,
              concerns: fitScore.concerns,
              recommendation: fitScore.recommendation,
              reasoning: fitScore.reasoning,
              qualifiedAt: new Date().toISOString(),
            },
          },
        })
        .eq("id", partnerId);
    });

    // Step 5: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "partnership",
        action: "partner_qualified",
        entity_type: "partner",
        entity_id: partnerId,
        description: `Partner "${partner.name}" qualified with score ${fitScore.fit_score}/100`,
        metadata: {
          fitScore: fitScore.fit_score,
          recommendation: fitScore.recommendation,
        },
      });
    });

    return {
      partnerId,
      fitScore: fitScore.fit_score,
      recommendation: fitScore.recommendation,
    };
  },

);

/**
 * Send outreach to a partner
 */
export const sendPartnerOutreach = inngest.createFunction(
  {
    id: "partners-send-outreach",
    name: "Send Partner Outreach",
    throttle: {
      limit: 5,
      period: "1m",
    },
    triggers: [
      { event: "partners/outreach.scheduled" }
    ]
  },
  async ({ event, step }) => {
    // Parse event data with SKILL.md compliance (model + autonomy_mode)
    const eventData = parseAgentEventData<{
      partnerId: string;
      orgId: string;
      outreachId: string;
      email: string;
      subject: string;
      body: string;
    }>(event.data);
    const {
      partnerId,
      orgId,
      outreachId,
      email,
      subject,
      body,
      autonomy_mode,
    } = eventData;

    // Check if approval required for send_partner_outreach (SKILL.md: 3-tier Autonomy)
    if (requiresApproval("send_partner_outreach", autonomy_mode)) {
      const approval = await requestApprovalAndWait(step as any, {
        orgId,
        agentType: "partnership",
        action: "send_partner_outreach",
        title: `Send partnership outreach to ${email}`,
        description: `Subject: ${subject}`,
        params: { partnerId, outreachId },
        previewData: { email, subject, bodyPreview: body.substring(0, 200) },
        riskLevel: "medium",
      });

      if (!approval.approved) {
        return {
          success: false,
          error: "Outreach rejected",
          comment: approval.comment,
        };
      }
    }

    // Step 1: Send the email
    const sendResult = await step.run("send-email", async () => {
      try {
        const result = await sendNotification({
          recipient: { email },
          subject,
          message: body,
          channels: ["email"],
        });
        return result.results[0];
      } catch (error) {
        console.error("Failed to send partner outreach:", error);
        throw error;
      }
    });

    // Step 2: Update outreach record
    await step.run("update-outreach-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("partner_outreach")
        .update({
          status: sendResult.success ? "sent" : "failed",
          sent_at: sendResult.success ? new Date().toISOString() : null,
          error_message: sendResult.error || null,
        })
        .eq("id", outreachId);
    });

    // Step 3: Update partner status
    if (sendResult.success) {
      await step.run("update-partner-status", async () => {
        const supabase = getUntypedClient();
        await supabase
          .from("partners")
          .update({
            status: "contacted",
            last_contacted_at: new Date().toISOString(),
          })
          .eq("id", partnerId);
      });
    }

    // Step 4: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "partnership",
        action: sendResult.success ? "outreach_sent" : "outreach_failed",
        entity_type: "partner",
        entity_id: partnerId,
        description: sendResult.success
          ? `Partnership outreach sent to ${email}`
          : `Failed to send outreach: ${sendResult.error}`,
        metadata: { outreachId, email },
      });
    });

    // Step 5: Notify org owner of result with preferences
    await step.run("send-notification", async () => {
      const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
      const owner = await getOrgOwner(orgId);
      if (owner && ownerPrefs) {
        if (
          sendResult.success &&
          ownerPrefs.preferences.eventPreferences.agentCompletion
        ) {
          await notifyAgentCompletion(
            owner,
            {
              agentName: "Partnerships",
              action: "Partner Outreach",
              details: `Outreach email sent to ${email}`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        } else if (
          !sendResult.success &&
          ownerPrefs.preferences.eventPreferences.agentErrors
        ) {
          await notifyAgentError(
            owner,
            {
              agentName: "Partnerships",
              action: "Partner Outreach",
              error: `Failed to send outreach to ${email}: ${sendResult.error}`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    return { success: sendResult.success, error: sendResult.error };
  },

);
