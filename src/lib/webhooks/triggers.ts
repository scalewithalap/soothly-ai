/**
 * Webhook Triggers Service
 *
 * Handles incoming webhooks from Zapier, Make, and other automation platforms.
 * Allows external systems to trigger actions in Zero Headache.
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/inngest/client";
import { z } from "zod";

// ============================================================================
// Available Trigger Actions
// ============================================================================

export const WEBHOOK_TRIGGERS = [
  "enroll_contact_sequence",
  "pause_enrollment",
  "resume_enrollment",
  "create_lead_campaign",
  "enrich_leads",
  "generate_article",
  "discover_partners",
  "create_proposal",
  "add_competitor",
] as const;

export type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];

// Trigger descriptions for documentation
export const TRIGGER_DESCRIPTIONS: Record<WebhookTrigger, string> = {
  enroll_contact_sequence: "Enroll a contact into an email sequence",
  pause_enrollment: "Pause an active sequence enrollment",
  resume_enrollment: "Resume a paused sequence enrollment",
  create_lead_campaign: "Create a new lead generation campaign",
  enrich_leads: "Enrich existing leads with additional data",
  generate_article: "Generate an SEO article from a brief",
  discover_partners: "Start partner discovery for a domain",
  create_proposal: "Generate a proposal for a prospect",
  add_competitor: "Add a new competitor to monitor",
};

// ============================================================================
// Trigger Schemas
// ============================================================================

const EnrollContactSchema = z.object({
  sequenceId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

const PauseResumeEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
});

const CreateLeadCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  keywords: z.array(z.string()).optional(),
  jobTitles: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  source: z.enum(["linkedin", "google_maps"]).default("linkedin"),
  maxResults: z.number().int().positive().max(500).default(50),
  autoEnrollSequenceId: z.string().uuid().optional(),
});

const EnrichLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(100),
});

const GenerateArticleSchema = z.object({
  topic: z.string().min(5).max(500),
  keywords: z.array(z.string()).optional(),
  targetLength: z.enum(["short", "medium", "long"]).default("medium"),
  tone: z.enum(["professional", "casual", "technical"]).default("professional"),
});

const DiscoverPartnersSchema = z.object({
  domain: z.string().min(3),
  industry: z.string().optional(),
  partnershipType: z
    .enum(["affiliate", "referral", "integration", "co-marketing"])
    .optional(),
  maxResults: z.number().int().positive().max(100).default(20),
});

const CreateProposalSchema = z.object({
  prospectName: z.string().min(1),
  prospectCompany: z.string().min(1),
  prospectEmail: z.string().email().optional(),
  dealValue: z.number().positive().optional(),
  serviceType: z.string().optional(),
  notes: z.string().optional(),
});

const AddCompetitorSchema = z.object({
  domain: z.string().min(3),
  name: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

// Schema mapping
const TRIGGER_SCHEMAS: Record<WebhookTrigger, z.ZodSchema> = {
  enroll_contact_sequence: EnrollContactSchema,
  pause_enrollment: PauseResumeEnrollmentSchema,
  resume_enrollment: PauseResumeEnrollmentSchema,
  create_lead_campaign: CreateLeadCampaignSchema,
  enrich_leads: EnrichLeadsSchema,
  generate_article: GenerateArticleSchema,
  discover_partners: DiscoverPartnersSchema,
  create_proposal: CreateProposalSchema,
  add_competitor: AddCompetitorSchema,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// ============================================================================
// Trigger Execution
// ============================================================================

export interface TriggerResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

/**
 * Validate and execute an incoming webhook trigger
 */
export async function executeWebhookTrigger(
  orgId: string,
  action: WebhookTrigger,
  payload: Record<string, unknown>,
): Promise<TriggerResult> {
  // Validate the action
  if (!WEBHOOK_TRIGGERS.includes(action)) {
    return {
      success: false,
      error: `Unknown trigger action: ${action}`,
      errorCode: "UNKNOWN_ACTION",
    };
  }

  // Validate the payload
  const schema = TRIGGER_SCHEMAS[action];
  const parseResult = schema.safeParse(payload);

  if (!parseResult.success) {
    return {
      success: false,
      error: "Invalid payload",
      errorCode: "VALIDATION_ERROR",
      data: { issues: parseResult.error.issues },
    };
  }

  const validatedPayload = parseResult.data;

  // Execute the trigger
  try {
    switch (action) {
      case "enroll_contact_sequence":
        return await handleEnrollContact(
          orgId,
          validatedPayload as z.infer<typeof EnrollContactSchema>,
        );

      case "pause_enrollment":
        return await handlePauseEnrollment(
          orgId,
          validatedPayload as z.infer<typeof PauseResumeEnrollmentSchema>,
        );

      case "resume_enrollment":
        return await handleResumeEnrollment(
          orgId,
          validatedPayload as z.infer<typeof PauseResumeEnrollmentSchema>,
        );

      case "create_lead_campaign":
        return await handleCreateLeadCampaign(
          orgId,
          validatedPayload as z.infer<typeof CreateLeadCampaignSchema>,
        );

      case "enrich_leads":
        return await handleEnrichLeads(
          orgId,
          validatedPayload as z.infer<typeof EnrichLeadsSchema>,
        );

      case "generate_article":
        return await handleGenerateArticle(
          orgId,
          validatedPayload as z.infer<typeof GenerateArticleSchema>,
        );

      case "discover_partners":
        return await handleDiscoverPartners(
          orgId,
          validatedPayload as z.infer<typeof DiscoverPartnersSchema>,
        );

      case "create_proposal":
        return await handleCreateProposal(
          orgId,
          validatedPayload as z.infer<typeof CreateProposalSchema>,
        );

      case "add_competitor":
        return await handleAddCompetitor(
          orgId,
          validatedPayload as z.infer<typeof AddCompetitorSchema>,
        );

      default:
        return {
          success: false,
          error: "Action not implemented",
          errorCode: "NOT_IMPLEMENTED",
        };
    }
  } catch (error) {
    console.error(`Trigger execution failed for ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
      errorCode: "EXECUTION_ERROR",
    };
  }
}

// ============================================================================
// Trigger Handlers
// ============================================================================

async function handleEnrollContact(
  orgId: string,
  payload: z.infer<typeof EnrollContactSchema>,
): Promise<TriggerResult> {
  const { enrollContact } = await import("@/lib/sequences/enrollments");

  const result = await enrollContact(payload.sequenceId, {
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    company: payload.company,
    title: payload.title,
    customFields: payload.customFields as Record<string, string> | undefined,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to enroll contact",
      errorCode: "ENROLLMENT_FAILED",
    };
  }

  return {
    success: true,
    data: { enrollmentId: result.enrollmentId },
  };
}

async function handlePauseEnrollment(
  orgId: string,
  payload: z.infer<typeof PauseResumeEnrollmentSchema>,
): Promise<TriggerResult> {
  const { pauseEnrollment } = await import("@/lib/sequences/enrollments");

  try {
    await pauseEnrollment(payload.enrollmentId);
    return { success: true, data: { enrollmentId: payload.enrollmentId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to pause enrollment",
      errorCode: "PAUSE_FAILED",
    };
  }
}

async function handleResumeEnrollment(
  orgId: string,
  payload: z.infer<typeof PauseResumeEnrollmentSchema>,
): Promise<TriggerResult> {
  const { resumeEnrollment } = await import("@/lib/sequences/enrollments");

  try {
    await resumeEnrollment(payload.enrollmentId);
    return { success: true, data: { enrollmentId: payload.enrollmentId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resume enrollment",
      errorCode: "RESUME_FAILED",
    };
  }
}

async function handleCreateLeadCampaign(
  orgId: string,
  payload: z.infer<typeof CreateLeadCampaignSchema>,
): Promise<TriggerResult> {
  const supabase = getSupabaseAdmin();

  // Create campaign
  const { data: campaign, error } = await supabase
    .from("lead_campaigns")
    .insert({
      org_id: orgId,
      name: payload.name,
      status: "active",
      target_criteria: {
        keywords: payload.keywords,
        jobTitles: payload.jobTitles,
        locations: payload.locations,
        industries: payload.industries,
        source: payload.source,
        maxResults: payload.maxResults,
        autoEnrollSequenceId: payload.autoEnrollSequenceId,
      },
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
      errorCode: "CREATE_CAMPAIGN_FAILED",
    };
  }

  // Trigger campaign processing
  await inngest.send({
    name: "leads/campaign.created",
    data: {
      campaignId: campaign.id,
      orgId,
    },
  });

  return {
    success: true,
    data: { campaignId: campaign.id },
  };
}

async function handleEnrichLeads(
  orgId: string,
  payload: z.infer<typeof EnrichLeadsSchema>,
): Promise<TriggerResult> {
  // Trigger enrichment via Inngest
  await inngest.send({
    name: "leads/enrich.requested",
    data: {
      leadIds: payload.leadIds,
      orgId,
    },
  });

  return {
    success: true,
    data: { leadIds: payload.leadIds, status: "processing" },
  };
}

async function handleGenerateArticle(
  orgId: string,
  payload: z.infer<typeof GenerateArticleSchema>,
): Promise<TriggerResult> {
  const supabase = getSupabaseAdmin();

  // Create content brief
  const { data: brief, error } = await supabase
    .from("content_briefs")
    .insert({
      org_id: orgId,
      topic: payload.topic,
      keywords: payload.keywords || [],
      target_length: payload.targetLength,
      tone: payload.tone,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
      errorCode: "CREATE_BRIEF_FAILED",
    };
  }

  // Trigger article generation
  await inngest.send({
    name: "content/article.generate",
    data: {
      briefId: brief.id,
      orgId,
    },
  });

  return {
    success: true,
    data: { briefId: brief.id, status: "generating" },
  };
}

async function handleDiscoverPartners(
  orgId: string,
  payload: z.infer<typeof DiscoverPartnersSchema>,
): Promise<TriggerResult> {
  // Trigger partner discovery
  await inngest.send({
    name: "partners/discovery.start",
    data: {
      domain: payload.domain,
      industry: payload.industry,
      partnershipType: payload.partnershipType,
      maxResults: payload.maxResults,
      orgId,
    },
  });

  return {
    success: true,
    data: { domain: payload.domain, status: "discovering" },
  };
}

async function handleCreateProposal(
  orgId: string,
  payload: z.infer<typeof CreateProposalSchema>,
): Promise<TriggerResult> {
  const supabase = getSupabaseAdmin();

  // Create proposal record
  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      org_id: orgId,
      prospect_name: payload.prospectName,
      prospect_company: payload.prospectCompany,
      prospect_email: payload.prospectEmail,
      deal_value: payload.dealValue,
      service_type: payload.serviceType,
      notes: payload.notes,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
      errorCode: "CREATE_PROPOSAL_FAILED",
    };
  }

  // Trigger proposal generation
  await inngest.send({
    name: "proposal/create.full",
    data: {
      proposalId: proposal.id,
      orgId,
    },
  });

  return {
    success: true,
    data: { proposalId: proposal.id, status: "generating" },
  };
}

async function handleAddCompetitor(
  orgId: string,
  payload: z.infer<typeof AddCompetitorSchema>,
): Promise<TriggerResult> {
  // Trigger competitor addition
  await inngest.send({
    name: "intel/competitor.add",
    data: {
      domain: payload.domain,
      name: payload.name,
      priority: payload.priority,
      orgId,
    },
  });

  return {
    success: true,
    data: { domain: payload.domain, status: "monitoring" },
  };
}

// ============================================================================
// Trigger Documentation Helpers
// ============================================================================

export interface TriggerDocumentation {
  action: WebhookTrigger;
  description: string;
  payloadSchema: Record<string, unknown>;
  example: Record<string, unknown>;
}

/**
 * Get documentation for all triggers
 */
export function getTriggerDocumentation(): TriggerDocumentation[] {
  return [
    {
      action: "enroll_contact_sequence",
      description: TRIGGER_DESCRIPTIONS.enroll_contact_sequence,
      payloadSchema: {
        sequenceId: { type: "string", format: "uuid", required: true },
        email: { type: "string", format: "email", required: true },
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        company: { type: "string", required: false },
        title: { type: "string", required: false },
        customFields: { type: "object", required: false },
      },
      example: {
        sequenceId: "123e4567-e89b-12d3-a456-426614174000",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        company: "Acme Inc",
      },
    },
    {
      action: "create_lead_campaign",
      description: TRIGGER_DESCRIPTIONS.create_lead_campaign,
      payloadSchema: {
        name: { type: "string", required: true },
        keywords: { type: "array", items: "string", required: false },
        jobTitles: { type: "array", items: "string", required: false },
        locations: { type: "array", items: "string", required: false },
        source: {
          type: "enum",
          values: ["linkedin", "google_maps"],
          default: "linkedin",
        },
        maxResults: { type: "number", min: 1, max: 500, default: 50 },
      },
      example: {
        name: "Tech Startups Q1 Campaign",
        keywords: ["SaaS", "AI"],
        locations: ["San Francisco", "New York"],
        source: "linkedin",
        maxResults: 100,
      },
    },
    {
      action: "generate_article",
      description: TRIGGER_DESCRIPTIONS.generate_article,
      payloadSchema: {
        topic: { type: "string", minLength: 5, required: true },
        keywords: { type: "array", items: "string", required: false },
        targetLength: {
          type: "enum",
          values: ["short", "medium", "long"],
          default: "medium",
        },
        tone: {
          type: "enum",
          values: ["professional", "casual", "technical"],
          default: "professional",
        },
      },
      example: {
        topic: "10 Best Practices for B2B Lead Generation in 2026",
        keywords: ["lead generation", "B2B", "sales"],
        targetLength: "long",
        tone: "professional",
      },
    },
  ];
}
