/**
 * Lead Generation Agent Functions
 * Background jobs for lead scraping, enrichment, and outreach
 *
 * Note: Using type assertions due to Supabase client type generation lag.
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper to work around typed client limitations
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Handle new lead campaign creation
 * Triggers initial scraping when a campaign is activated
 */
export const handleCampaignCreated = inngest.createFunction(
  {
    id: "leads-campaign-created",
    name: "Lead Campaign Created",
  },
  { event: "leads/campaign.created" },
  async ({ event, step }) => {
    const { campaignId, orgId } = event.data as {
      campaignId: string;
      orgId: string;
    };

    // Step 1: Mark campaign as processing
    await step.run("update-campaign-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("lead_campaigns")
        .update({ status: "active" })
        .eq("id", campaignId);
    });

    // Step 2: Trigger scraping (placeholder - would call external API)
    const scrapedLeads = await step.run("scrape-leads", async () => {
      // TODO: Implement actual scraping logic via Apify or similar
      console.log(`Scraping leads for campaign ${campaignId}`);
      return { count: 0, leads: [] };
    });

    // Step 3: Update campaign with results
    await step.run("update-campaign-results", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("lead_campaigns")
        .update({
          leads_collected: scrapedLeads.count,
        })
        .eq("id", campaignId);
    });

    // Step 4: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "lead_generation",
        action: "campaign_started",
        entity_type: "lead_campaign",
        entity_id: campaignId,
        description: `Campaign started, ${scrapedLeads.count} leads found`,
        metadata: {},
      });
    });

    return { success: true, leadsFound: scrapedLeads.count };
  }
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
  },
  { event: "leads/enrich.requested" },
  async ({ event, step }) => {
    const { leadIds, orgId } = event.data as {
      leadIds: string[];
      orgId: string;
    };

    // Log start
    console.log(
      `Starting enrichment for ${leadIds.length} leads in org ${orgId}`
    );

    for (const leadId of leadIds) {
      await step.run(`enrich-lead-${leadId}`, async () => {
        // TODO: Implement enrichment API calls (Clearbit, Apollo, etc.)
        console.log(`Enriching lead ${leadId}`);
      });
    }

    return { enriched: leadIds.length };
  }
);
