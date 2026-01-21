import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "@/inngest/client";

const enrichLeadSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
});

/**
 * GET /api/agents/leads/enrich?leadId=xxx
 * Fetch enrichment data for a lead
 */
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");

  if (!leadId) {
    throw new AppError(
      ErrorCodes.VALIDATION_INVALID_INPUT,
      "leadId is required",
      400,
    );
  }

  // Get user's org
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Get contact details
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", leadId)
    .eq("org_id", userData.org_id)
    .single();

  if (!contact) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Lead not found", 404);
  }

  // Get enrichment data from lead_contacts if exists
  const { data: leadContact } = await supabase
    .from("lead_contacts")
    .select("enrichment_data, lead_score, enrichment_status")
    .eq("contact_id", leadId)
    .single();

  const enrichment = (leadContact?.enrichment_data || {}) as Record<
    string,
    unknown
  >;

  // Build buying signals from enrichment
  const signals = [];
  if (enrichment.company && typeof enrichment.company === "object") {
    const company = enrichment.company as Record<string, unknown>;
    if (company.employeeCount && (company.employeeCount as number) > 50) {
      signals.push({
        type: "Team Size",
        score: 75,
        description: `${company.employeeCount} employees`,
      });
    }
    if (company.industry) {
      signals.push({
        type: "Industry",
        score: 80,
        description: `${company.industry}`,
      });
    }
  }
  if (enrichment.techStack) {
    signals.push({
      type: "Tech Stack",
      score: 85,
      description: `Uses ${(enrichment.techStack as string[]).slice(0, 3).join(", ")}`,
    });
  }

  return apiSuccess({
    contact,
    enrichment: {
      summary: enrichment.summary || enrichment.aiScoreReason || null,
      techStack: enrichment.techStack || [],
      signals,
      status: leadContact?.enrichment_status || "pending",
      score: leadContact?.lead_score || 50,
    },
  });
});

/**
 * POST /api/agents/leads/enrich
 * Trigger enrichment for a lead
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const parsed = await validateBody(request, enrichLeadSchema);

  // Get user's org
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Verify contact exists
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", parsed.leadId)
    .eq("org_id", userData.org_id)
    .single();

  if (!contact) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Lead not found", 404);
  }

  // Trigger Inngest enrichment
  await inngest.send({
    name: "leads/enrich.requested",
    data: {
      leadIds: [parsed.leadId],
      orgId: userData.org_id,
    },
  });

  return apiSuccess({
    message: "Enrichment requested",
    leadId: parsed.leadId,
  });
});
