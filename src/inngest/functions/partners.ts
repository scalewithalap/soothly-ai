/**
 * Partnership Agent Functions
 * Background jobs for partner discovery and outreach
 *
 * Note: Using type assertions due to Supabase client type generation lag.
 * Once types are regenerated from Supabase CLI, these can be removed.
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Prospect {
  name: string;
  website?: string;
  contactEmail?: string;
}

// Type helper to work around typed client limitations
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Discover potential partners based on criteria
 */
export const discoverPartners = inngest.createFunction(
  {
    id: "partners-discover",
    name: "Discover Partners",
    throttle: {
      limit: 5,
      period: "1m",
    },
  },
  { event: "partners/discover.requested" },
  async ({ event, step }) => {
    const { industry, orgId, partnerType } = event.data as {
      industry: string;
      orgId: string;
      partnerType: string;
    };

    // Step 1: Search for potential partners (placeholder)
    const prospects = await step.run("search-prospects", async () => {
      // TODO: Implement actual partner discovery via APIs
      console.log(`Searching for ${partnerType} partners in ${industry}`);
      return [] as Prospect[];
    });

    // Step 2: Create partner records
    await step.run("create-partner-records", async () => {
      const supabase = getUntypedClient();

      for (const prospect of prospects) {
        await supabase.from("partners").insert({
          org_id: orgId,
          name: prospect.name,
          type: partnerType,
          status: "prospect",
          tier: "standard",
          fit_score: 0,
          fit_breakdown: {},
          terms: {},
          total_referrals: 0,
          total_revenue: 0,
          total_commissions_paid: 0,
          conversion_rate: 0,
          api_enabled: false,
          metadata: { source: "discovery", industry },
        });
      }
    });

    // Step 3: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "partnership",
        action: "discovery_completed",
        entity_type: "partner",
        description: `Found ${prospects.length} potential partners in ${industry}`,
        metadata: { industry, partnerType },
      });
    });

    return { found: prospects.length };
  }
);

/**
 * Qualify and score a partner
 */
export const qualifyPartner = inngest.createFunction(
  {
    id: "partners-qualify",
    name: "Qualify Partner",
  },
  { event: "partners/qualify.requested" },
  async ({ event, step }) => {
    const { partnerId, orgId } = event.data as {
      partnerId: string;
      orgId: string;
    };

    // Step 1: Get partner details
    const partner = await step.run("get-partner", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerId)
        .single();
      return data as { name: string } | null;
    });

    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    // Step 2: Calculate fit score (placeholder)
    const fitScore = await step.run("calculate-fit-score", async () => {
      // TODO: Implement AI-powered scoring
      console.log(`Scoring partner: ${partner.name}`);
      return {
        score: 75,
        breakdown: {
          industry_fit: 80,
          size_fit: 70,
          reach_fit: 75,
        },
      };
    });

    // Step 3: Update partner with score
    await step.run("update-partner-score", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("partners")
        .update({
          fit_score: fitScore.score,
          fit_breakdown: fitScore.breakdown,
          status: fitScore.score >= 70 ? "contacted" : "prospect",
        })
        .eq("id", partnerId);
    });

    // Log for debugging
    console.log(`Qualified partner ${partnerId} for org ${orgId}`);

    return { partnerId, fitScore: fitScore.score };
  }
);
