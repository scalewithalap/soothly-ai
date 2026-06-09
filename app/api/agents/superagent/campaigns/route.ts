import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { SUPERAGENT_EVENTS } from "@/inngest/events";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { requireAgentQuota } from "@/lib/usage";
import type { SupabaseClient } from "@supabase/supabase-js";

const planSchema = z.object({
  type: z.enum([
    "niche_takeover",
    "content_blitz",
    "outbound",
    "competitive_response",
    "custom",
  ]),
  objective: z.string().min(1),
  inputs: z.record(z.string(), z.any()),
});

/**
 * GET /api/agents/superagent/campaigns - List campaigns
 */
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

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

  const { data: campaigns, error } = await supabase
    .from("superagent_campaigns")
    .select("id, name, type, status, steps, created_at, updated_at")
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

  const mapped = (campaigns || []).map((c) => {
    const steps = (c.steps as unknown[]) || [];
    const completedSteps = steps.filter(
      (s: any) => s.status === "completed",
    ).length;
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      progress: `Step ${completedSteps}/${steps.length}`,
      updatedAt: formatRelativeTime(c.updated_at),
    };
  });

  return apiSuccess({ campaigns: mapped });
});

/**
 * POST /api/agents/superagent/campaigns - Plan a new campaign
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { type, objective, inputs } = await validateBody(request, planSchema);

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Paid-plan gate + quota: superagent_campaigns has limit -1 on free tier,
  // so requireAgentQuota throws 402 with upgrade messaging for free orgs and
  // 429 when a paid org exhausts its monthly campaigns (ADR-008/ADR-011).
  await requireAgentQuota(userData.org_id, "superagent");

  // Trigger Inngest campaign planning
  await inngest.send({
    name: SUPERAGENT_EVENTS.CAMPAIGN_PLAN,
    data: {
      type,
      objective,
      inputs,
      orgId: userData.org_id,
    },
  });

  return apiSuccess({
    message: "Campaign planning started",
    type,
  });
});

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
