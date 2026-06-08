/**
 * Lead-to-Sequence Integration
 * Connects Lead Generation agent with Email Sequencing Engine
 *
 * When leads are generated, this function auto-enrolls qualified leads
 * into configured email sequences.
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { enrollContact } from "@/lib/sequences/enrollments";

/**
 * Auto-enroll leads into email sequences after campaign completion
 *
 * Triggered when: leads/auto-enroll.sequence event is emitted
 * Action: Enrolls high-scoring leads into the configured sequence
 */
export const autoEnrollLeadsInSequence = inngest.createFunction(
  {
    id: "sequence-auto-enroll-leads",
    name: "Auto-Enroll Leads in Sequence",
    throttle: {
      limit: 5,
      period: "1m",
    },
    triggers: [
      { event: "leads/auto-enroll.sequence" }
    ]
  },
  async ({ event, step }) => {
    const {
      campaignId,
      sequenceId,
      orgId,
      minScore = 60,
      maxEnrollments = 50,
    } = event.data as {
      campaignId: string;
      sequenceId: string;
      orgId: string;
      minScore?: number;
      maxEnrollments?: number;
    };

    // Step 1: Get qualified leads from the campaign
    const leads = await step.run("get-qualified-leads", async () => {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("lead_contacts")
        .select(
          `
          id,
          contact_id,
          lead_score,
          enrichment_data,
          contacts!inner(
            id,
            email,
            full_name,
            job_title
          )
        `,
        )
        .eq("campaign_id", campaignId)
        .gte("lead_score", minScore)
        .eq("qualification_status", "new")
        .order("lead_score", { ascending: false })
        .limit(maxEnrollments);

      return data ?? [];
    });

    if (leads.length === 0) {
      return {
        success: true,
        enrolled: 0,
        message: "No qualified leads found",
      };
    }

    // Step 2: Verify sequence exists and is active
    const sequence = await step.run("verify-sequence", async () => {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("email_sequences")
        .select("id, name, status")
        .eq("id", sequenceId)
        .eq("status", "active")
        .single();
      return data;
    });

    if (!sequence) {
      return { success: false, error: "Sequence not found or not active" };
    }

    // Step 3: Enroll each lead
    let enrolledCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      const contact = lead.contacts as {
        id: string;
        email: string;
        full_name: string;
        job_title?: string;
      };
      const enrichment = lead.enrichment_data as {
        company?: string;
        firstName?: string;
        lastName?: string;
      } | null;

      if (!contact?.email) continue;

      try {
        await step.run(`enroll-${lead.id}`, async () => {
          // Parse name
          const nameParts = (contact.full_name || "").split(" ");
          const firstName = enrichment?.firstName || nameParts[0] || "";
          const lastName =
            enrichment?.lastName || nameParts.slice(1).join(" ") || "";

          await enrollContact(sequenceId, {
            email: contact.email,
            firstName,
            lastName,
            company: enrichment?.company,
            title: contact.job_title,
            customFields: {
              leadScore: String(lead.lead_score || 0),
              campaignId,
              leadContactId: lead.id,
            },
          });

          // Update lead qualification status
          const supabase = createSupabaseAdminClient();
          await supabase
            .from("lead_contacts")
            .update({ qualification_status: "in_sequence" })
            .eq("id", lead.id);

          enrolledCount++;
        });
      } catch (error) {
        errors.push(
          `Lead ${lead.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Step 4: Log activity
    await step.run("log-enrollment", async () => {
      const supabase = createSupabaseAdminClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "lead_generation",
        action: "sequence_enrollment",
        entity_type: "email_sequence",
        entity_id: sequenceId,
        description: `Enrolled ${enrolledCount} leads from campaign into sequence "${sequence.name}"`,
        metadata: { campaignId, enrolledCount, errors: errors.length },
      });
    });

    return {
      success: true,
      enrolled: enrolledCount,
      skipped: leads.length - enrolledCount,
      errors: errors.length,
    };
  },

);

/**
 * Listen for campaign completion and trigger auto-enrollment if configured
 *
 * Note: Looks for auto_enroll_sequence_id in target_criteria JSON field
 * This avoids needing a database migration
 */
export const onCampaignComplete = inngest.createFunction(
  {
    id: "sequence-on-campaign-complete",
    name: "On Campaign Complete - Check Auto-Enroll",
    triggers: [
      { event: "leads/campaign.completed" }
    ]
  },
  async ({ event, step }) => {
    const { campaignId, orgId, leadsFound } = event.data as {
      campaignId: string;
      orgId: string;
      leadsFound: number;
    };

    if (leadsFound === 0) {
      return { skipped: true, reason: "No leads found" };
    }

    // Check if campaign has auto-enrollment configured in target_criteria
    const config = await step.run("get-campaign-config", async () => {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("lead_campaigns")
        .select("target_criteria")
        .eq("id", campaignId)
        .single();
      return data;
    });

    // Look for autoEnrollSequenceId in target_criteria JSON
    const targetCriteria = config?.target_criteria as {
      autoEnrollSequenceId?: string;
      minScore?: number;
    } | null;

    if (!targetCriteria?.autoEnrollSequenceId) {
      return { skipped: true, reason: "No auto-enroll sequence configured" };
    }

    // Trigger auto-enrollment
    await step.sendEvent("trigger-auto-enroll", {
      name: "leads/auto-enroll.sequence",
      data: {
        campaignId,
        sequenceId: targetCriteria.autoEnrollSequenceId,
        orgId,
        minScore: targetCriteria.minScore ?? 60,
      },
    });

    return { triggered: true, sequenceId: targetCriteria.autoEnrollSequenceId };
  },

);
