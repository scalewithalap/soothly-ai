import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { LEAD_EVENTS } from "@/inngest/events";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { requireAgentQuota } from "@/lib/usage";
import type { SupabaseClient } from "@supabase/supabase-js";

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  target_criteria: z
    .object({
      industry: z.string().optional(),
      job_title: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
});

// GET /api/agents/leads/campaigns - List campaigns for current org
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's org
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: campaigns, error } = await supabase
    .from("lead_campaigns")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching campaigns:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch campaigns",
      500,
    );
  }

  return apiSuccess({ campaigns });
});

// POST /api/agents/leads/campaigns - Create a new campaign
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Validate request body
  const parsed = await validateBody(request, createCampaignSchema);

  // Get user's org
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Pre-check quota before creating + dispatching (success-based billing:
  // actual deduction happens in the workflow per lead saved).
  await requireAgentQuota(userData.org_id, "lead_gen");

  const { data: campaign, error } = await supabase
    .from("lead_campaigns")
    .insert({
      org_id: userData.org_id,
      name: parsed.name,
      target_criteria: parsed.target_criteria || {},
      status: "draft",
      leads_collected: 0,
      leads_contacted: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating campaign:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to create campaign",
      500,
    );
  }

  // Trigger Inngest event for background processing
  await inngest.send({
    name: LEAD_EVENTS.CAMPAIGN_CREATED,
    data: {
      campaignId: (campaign as { id: string }).id,
      orgId: userData.org_id,
    },
  });

  return apiSuccess({ campaign }, 201);
});
