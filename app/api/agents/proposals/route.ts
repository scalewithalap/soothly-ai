import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { requireAgentQuota } from "@/lib/usage";
import type { SupabaseClient } from "@supabase/supabase-js";

const analyzeSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

/**
 * GET /api/agents/proposals - List active prospects/proposals
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

  // Fetch prospects with latest proposal
  const { data: prospects, error } = await supabase
    .from("prospects")
    .select(
      `
      *,
      proposals!proposals_prospect_id_fkey(id, status, title, created_at)
    `,
    )
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching prospects:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch prospects",
      500,
    );
  }

  // Map to API response format
  const mapped = (prospects || []).map((p) => {
    const latestProposal = p.proposals?.[0];
    return {
      id: p.id,
      companyName: p.company_name || new URL(p.website_url).hostname,
      websiteUrl: p.website_url,
      status: p.status,
      proposalId: latestProposal?.id,
      value: p.analysis_data?.estimatedValue || 0,
      lastActivityAt: formatRelativeTime(p.updated_at),
      confidenceScore: p.analysis_data?.confidence || 0,
    };
  });

  return apiSuccess({ prospects: mapped });
});

/**
 * POST /api/agents/proposals - Start new analysis
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { url } = await validateBody(request, analyzeSchema);

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Pre-check quota before dispatch (deduction happens on completion).
  await requireAgentQuota(userData.org_id, "proposal");

  // Trigger full proposal workflow
  await inngest.send({
    name: "proposal/create.full",
    data: {
      orgId: userData.org_id,
      prospectUrl: url,
    },
  });

  return apiSuccess({
    message: "Analysis started",
    url,
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
