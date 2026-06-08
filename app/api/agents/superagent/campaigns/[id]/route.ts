import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import { SUPERAGENT_EVENTS } from "@/inngest/events";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/superagent/campaigns/[id] - Get campaign details
 */
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const campaignId = pathParts[pathParts.indexOf("campaigns") + 1];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: campaign, error } = await supabase
    .from("superagent_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("org_id", userData.org_id)
    .single();

  if (error || !campaign) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Campaign not found", 404);
  }

  return apiSuccess({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      objective: campaign.objective,
      status: campaign.status,
      inputs: campaign.inputs,
      results: campaign.results,
    },
    steps: (campaign.steps || []).map((s: any) => ({
      id: s.id,
      agentType: s.agentType,
      action: s.action,
      status: s.status,
      dependsOn: s.dependsOn || [],
      params: s.params,
      result: s.result,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    })),
  });
});

/**
 * POST /api/agents/superagent/campaigns/[id] - Execute or Cancel campaign
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const campaignId = pathParts[pathParts.indexOf("campaigns") + 1];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const body = await request.json();
  const action = body.action as "execute" | "cancel";

  if (action === "execute") {
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_EXECUTE,
      data: {
        campaignId,
        orgId: userData.org_id,
      },
    });
    return apiSuccess({ message: "Campaign execution started" });
  } else if (action === "cancel") {
    await inngest.send({
      name: SUPERAGENT_EVENTS.CAMPAIGN_CANCEL,
      data: {
        campaignId,
        orgId: userData.org_id,
      },
    });
    return apiSuccess({ message: "Campaign cancellation requested" });
  }

  throw new AppError(
    ErrorCodes.VALIDATION_INVALID_INPUT,
    "Invalid action",
    400,
  );
});
