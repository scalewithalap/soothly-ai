import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

const updateSchema = z.object({
  title: z.string().optional(),
  content: z.record(z.string(), z.any()).optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
});

/**
 * GET /api/agents/proposals/[id] - Get proposal details + analysis
 */
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Extract prospectId from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const prospectId = pathParts[pathParts.indexOf("proposals") + 1];

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

  // Fetch prospect with analysis and proposals
  const { data: prospect, error } = await supabase
    .from("prospects")
    .select(
      `
      *,
      proposals!proposals_prospect_id_fkey(*)
    `,
    )
    .eq("id", prospectId)
    .eq("org_id", userData.org_id)
    .single();

  if (error || !prospect) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Prospect not found", 404);
  }

  const proposal = prospect.proposals?.[0];

  return apiSuccess({
    prospect: {
      id: prospect.id,
      companyName: prospect.company_name,
      websiteUrl: prospect.website_url,
      status: prospect.status,
    },
    analysis: prospect.analysis_data,
    proposal: proposal
      ? {
          id: proposal.id,
          title: proposal.title,
          content: proposal.content,
          status: proposal.status,
        }
      : null,
  });
});

/**
 * PATCH /api/agents/proposals/[id] - Update proposal content/status
 */
export const PATCH = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Extract prospectId from URL context (we use prospectId as ID in route)
  // BUT wait, is the ID prospect ID or Proposal ID?
  // UI uses prospect ID to navigate. Data fetch uses prospect ID.
  // The route is standard REST: /proposals/[prospectId] in this context
  // because we access via prospect.

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const prospectId = pathParts[pathParts.indexOf("proposals") + 1];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { content, status, title } = await validateBody(request, updateSchema);

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // We are updating the PROPOSAL associated with this prospect
  // First find the proposal
  const { data: existingProposal } = await supabase
    .from("proposals")
    .select("id")
    .eq("prospect_id", prospectId)
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!existingProposal) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "Proposal not found for this prospect",
      404,
    );
  }

  const { data: updated, error } = await supabase
    .from("proposals")
    .update({
      ...(title && { title }),
      ...(content && { content }),
      ...(status && { status }),
    })
    .eq("id", existingProposal.id)
    .select()
    .single();

  if (error) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update proposal",
      500,
    );
  }

  // If status changed to 'sent', update prospect too
  if (status === "sent") {
    await supabase
      .from("prospects")
      .update({ status: "proposal_sent" })
      .eq("id", prospectId);
  }

  return apiSuccess({ proposal: updated });
});
