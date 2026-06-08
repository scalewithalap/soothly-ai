/**
 * Lead Generation Agent Functions
 * Background jobs for lead scraping, enrichment, and outreach
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  scrapeLinkedInLeads,
  scrapeGoogleMapsLeads,
  enrichLeadByDomain,
  enrichByLinkedIn,
  findEmail,
} from "@/lib/apify";
import {
  notifyAgentCompletion,
  notifyAgentError,
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
 * Handle new lead campaign creation
 * Triggers initial scraping when a campaign is activated
 */
export const handleCampaignCreated = inngest.createFunction(
  {
    id: "leads-campaign-created",
    name: "Lead Campaign Created",
    triggers: [
      { event: "leads/campaign.created" }
    ]
  },
  async ({ event, step }) => {
    // Parse event data with SKILL.md compliance (model + autonomy_mode)
    const eventData = parseAgentEventData<{
      campaignId: string;
      orgId: string;
    }>(event.data);
    const {
      campaignId,
      orgId,
      model: model,
      autonomy_mode: autonomy_mode,
    } = eventData;

    // Step 1: Get campaign details
    const campaign = await step.run("get-campaign", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("lead_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      return data;
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Step 2: Mark campaign as processing
    await step.run("update-campaign-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("lead_campaigns")
        .update({ status: "active" })
        .eq("id", campaignId);
    });

    // Step 3: Scrape leads using Apify based on campaign criteria
    const scrapedLeads = await step.run("scrape-leads", async () => {
      const criteria = campaign.target_criteria as {
        keywords?: string[];
        jobTitles?: string[];
        locations?: string[];
        industries?: string[];
        source?: "linkedin" | "google_maps";
        maxResults?: number;
      };

      try {
        if (criteria.source === "google_maps") {
          // Scrape from Google Maps for local businesses
          const query =
            criteria.keywords?.[0] || criteria.industries?.[0] || "business";
          const location = criteria.locations?.[0] || "United States";
          return await scrapeGoogleMapsLeads(
            query,
            location,
            criteria.maxResults || 50,
          );
        } else {
          // Default to LinkedIn scraping
          return await scrapeLinkedInLeads({
            keywords: criteria.keywords,
            jobTitles: criteria.jobTitles,
            locations: criteria.locations,
            industries: criteria.industries,
            maxResults: criteria.maxResults || 50,
          });
        }
      } catch (error) {
        console.error("Scraping error:", error);
        return [];
      }
    });

    // Step 4: AI-Powered Lead Scoring (uses `model` parameter)
    const scoredLeads = await step.run("score-leads", async () => {
      if (scrapedLeads.length === 0) return [];

      // Import AI generation utility
      const { generateWithModel } = await import("@/lib/ai");

      const scoringPrompt = `You are a B2B lead scoring expert. Score each lead from 0-100 based on:
- Job title relevance to our ICP
- Company size/industry fit
- Available contact info quality

Return JSON array: [{ "index": 0, "score": 85, "reason": "VP title, tech industry" }, ...]

Leads to score:
${JSON.stringify(scrapedLeads.slice(0, 20).map((l, i) => ({ index: i, name: l.name, title: l.title, company: l.company })))}`;

      try {
        const result = await generateWithModel(
          model || "gemini-3-flash",
          scoringPrompt,
        );
        const scores = JSON.parse(result.content) as Array<{
          index: number;
          score: number;
          reason: string;
        }>;
        return scrapedLeads.map((lead, idx) => {
          const scoreEntry = scores.find((s) => s.index === idx);
          return {
            ...lead,
            aiScore: scoreEntry?.score || 50,
            aiReason: scoreEntry?.reason || "Default score",
          };
        });
      } catch {
        // Fallback: return leads with default scores if AI fails
        return scrapedLeads.map((lead) => ({
          ...lead,
          aiScore: 50,
          aiReason: "Scoring unavailable",
        }));
      }
    });

    // Step 4.5: HITL Approval Gate (uses `autonomy_mode` parameter)
    if (requiresApproval("save_leads", autonomy_mode)) {
      const approval = await requestApprovalAndWait(
        step as Parameters<typeof requestApprovalAndWait>[0],
        {
          orgId,
          agentType: "lead_gen",
          action: "approve_lead_list",
          title: `Approve ${scoredLeads.length} Scraped Leads`,
          description: `The agent found ${scoredLeads.length} leads for campaign "${campaign.name}". Review before saving to your CRM.`,
          params: { campaignId },
          previewData: { topLeads: scoredLeads.slice(0, 5) },
          riskLevel: "low",
        },
      );

      if (!approval.approved) {
        return {
          success: false,
          error: "Lead list rejected by user",
          comment: approval.comment,
        };
      }
    }

    // Step 5: Save leads to database (now using scored leads)
    const savedCount = await step.run("save-leads", async () => {
      const supabase = getUntypedClient();
      let saved = 0;

      for (const lead of scoredLeads) {
        // Create or find contact
        const { data: contact } = await supabase
          .from("contacts")
          .upsert(
            {
              org_id: orgId,
              full_name: lead.name,
              email: lead.email,
              phone: lead.phone,
              job_title: lead.title,
              linkedin_url: lead.linkedinUrl,
            },
            { onConflict: "org_id,email" },
          )
          .select()
          .single();

        if (contact) {
          // Link contact to campaign with AI score
          await supabase.from("lead_contacts").insert({
            campaign_id: campaignId,
            contact_id: contact.id,
            lead_score: lead.aiScore, // Now using AI-generated score
            qualification_status: "new",
            enrichment_data: {
              company: lead.company,
              companyUrl: lead.companyUrl,
              location: lead.location,
              summary: lead.summary,
              aiScoreReason: lead.aiReason,
            },
          });
          saved++;
        }
      }

      return saved;
    });

    // Step 5: Update campaign with results
    await step.run("update-campaign-results", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("lead_campaigns")
        .update({
          leads_collected: savedCount,
        })
        .eq("id", campaignId);
    });

    // Step 6: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "lead_generation",
        action: "campaign_started",
        entity_type: "lead_campaign",
        entity_id: campaignId,
        description: `Campaign started, ${savedCount} leads found`,
        metadata: {},
      });
    });

    // Step 7: Send notification with user preferences
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
              agentName: "Lead Generation",
              action: "Lead Scraping",
              resultCount: savedCount,
              details: `Campaign "${campaign.name}" has collected ${savedCount} new leads.`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    // Step 8: Emit campaign completed event for sequence integration
    await step.sendEvent("emit-campaign-completed", {
      name: "leads/campaign.completed",
      data: {
        campaignId,
        orgId,
        leadsFound: savedCount,
      },
    });

    return { success: true, leadsFound: savedCount };
  },

);

/**
 * Enrich a batch of leads with additional data
 */
export const enrichLeads = inngest.createFunction(
  {
    id: "leads-enrich-batch",
    name: "Enrich Leads Batch",
    throttle: {
      limit: 10,
      period: "1m", // Max 10 per minute to avoid rate limits
    },
    triggers: [
      { event: "leads/enrich.requested" }
    ]
  },
  async ({ event, step }) => {
    const { leadIds, orgId } = event.data as {
      leadIds: string[];
      orgId: string;
    };

    let enrichedCount = 0;
    const errors: string[] = [];

    for (const leadId of leadIds) {
      await step.run(`enrich-lead-${leadId}`, async () => {
        const supabase = getUntypedClient();

        // Get lead contact details
        const { data: leadContact } = await supabase
          .from("lead_contacts")
          .select("*, contacts(*)")
          .eq("id", leadId)
          .single();

        if (!leadContact) {
          errors.push(`Lead ${leadId} not found`);
          return;
        }

        const contact = leadContact.contacts as {
          linkedin_url?: string;
          email?: string;
          full_name?: string;
          job_title?: string;
        };

        try {
          let enrichmentData: Record<string, unknown> =
            leadContact.enrichment_data || {};

          // Try LinkedIn enrichment first
          if (contact?.linkedin_url) {
            const linkedInData = await enrichByLinkedIn(contact.linkedin_url);
            enrichmentData = { ...enrichmentData, ...linkedInData };
          }

          // Try domain enrichment if we have company website
          const companyUrl = (
            leadContact.enrichment_data as { companyUrl?: string }
          )?.companyUrl;
          if (companyUrl) {
            const domain = new URL(companyUrl).hostname;
            const companyData = await enrichLeadByDomain(domain);
            enrichmentData = { ...enrichmentData, company: companyData };
          }

          // Find email if not present
          if (!contact?.email && contact?.full_name) {
            const companyName = (
              leadContact.enrichment_data as { company?: string }
            )?.company;
            if (companyName) {
              const email = await findEmail(contact.full_name, companyName);
              if (email) {
                // Update contact email
                await supabase
                  .from("contacts")
                  .update({ email })
                  .eq("id", leadContact.contact_id);
              }
            }
          }

          // Update lead with enrichment data
          await supabase
            .from("lead_contacts")
            .update({
              enrichment_data: enrichmentData,
              enrichment_status: "completed",
            })
            .eq("id", leadId);

          enrichedCount++;
        } catch (error) {
          console.error(`Enrichment failed for lead ${leadId}:`, error);
          errors.push(
            `Lead ${leadId}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );

          await supabase
            .from("lead_contacts")
            .update({ enrichment_status: "failed" })
            .eq("id", leadId);
        }
      });
    }

    // Send notification with user preferences
    await step.run("send-notification", async () => {
      const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
      const owner = await getOrgOwner(orgId);
      if (owner && ownerPrefs) {
        if (
          errors.length === 0 &&
          ownerPrefs.preferences.eventPreferences.agentCompletion
        ) {
          await notifyAgentCompletion(
            owner,
            {
              agentName: "Lead Generation",
              action: "Lead Enrichment",
              resultCount: enrichedCount,
              details: `Successfully enriched ${enrichedCount} leads with additional data.`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        } else if (
          errors.length > 0 &&
          ownerPrefs.preferences.eventPreferences.agentErrors
        ) {
          await notifyAgentError(
            owner,
            {
              agentName: "Lead Generation",
              action: "Lead Enrichment",
              error: `Enriched ${enrichedCount} leads, but ${
                errors.length
              } failed: ${errors.slice(0, 3).join(", ")}`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    return { enriched: enrichedCount, errors: errors.length };
  },

);

/**
 * Send outreach to a lead
 */
export const sendLeadOutreach = inngest.createFunction(
  {
    id: "leads-send-outreach",
    name: "Send Lead Outreach",
    throttle: {
      limit: 5,
      period: "1m", // Rate limit to avoid spam
    },
    triggers: [
      { event: "leads/outreach.scheduled" }
    ]
  },
  async ({ event, step }) => {
    // Parse event data with SKILL.md compliance (model + autonomy_mode)
    const eventData = parseAgentEventData<{
      leadId: string;
      sequenceId: string;
      orgId: string;
    }>(event.data);
    const { leadId, sequenceId, orgId, autonomy_mode } = eventData;

    // Step 1: Get lead and sequence details
    const leadData = await step.run("get-lead-data", async () => {
      const supabase = getUntypedClient();

      const { data: lead } = await supabase
        .from("lead_contacts")
        .select("*, contacts(*)")
        .eq("id", leadId)
        .single();

      const { data: sequence } = await supabase
        .from("outreach_sequences")
        .select("*")
        .eq("id", sequenceId)
        .single();

      return { lead, sequence };
    });

    if (!leadData.lead || !leadData.sequence) {
      return { success: false, error: "Lead or sequence not found" };
    }

    // Step 2: Check if approval required for send_outreach (SKILL.md: 3-tier Autonomy)
    if (requiresApproval("send_outreach", autonomy_mode)) {
      const contact = leadData.lead.contacts as {
        full_name?: string;
        email?: string;
      };
      const approval = await requestApprovalAndWait(step as any, {
        orgId,
        agentType: "lead_gen",
        action: "send_outreach",
        title: `Send outreach email to ${contact?.full_name || "lead"}`,
        description: `Sending first step of sequence "${leadData.sequence.name}" to ${contact?.email}`,
        params: { leadId, sequenceId },
        previewData: { contact, sequence: leadData.sequence },
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

    // Step 2: Send the outreach (email, SMS, etc based on sequence config)
    // This would integrate with the email service
    await step.run("send-outreach", async () => {
      const contact = leadData.lead.contacts as {
        email?: string;
        phone?: string;
        full_name?: string;
      };

      if (!contact?.email) {
        throw new Error("No contact email available");
      }

      // Get first step of sequence
      const supabase = getUntypedClient();
      const { data: step } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .eq("step_order", 1)
        .single();

      if (step) {
        // Send via notification service
        const { sendNotification } = await import("@/lib/notifications");
        await sendNotification({
          recipient: { email: contact.email, name: contact.full_name },
          subject: step.subject || "Partnership Opportunity",
          message: step.content || "",
          channels: ["email"],
        });
      }
    });

    // Step 3: Log the outreach
    await step.run("log-outreach", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "lead_generation",
        action: "outreach_sent",
        entity_type: "lead_contact",
        entity_id: leadId,
        description: "Outreach email sent",
        metadata: { sequenceId },
      });
    });

    return { success: true };
  },

);
