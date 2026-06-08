import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/partners/[partnerId]
 * Fetch a single partner with full details and qualification data
 */
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Extract partnerId from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const partnerId = pathParts[pathParts.length - 1];

  if (!partnerId) {
    throw new AppError(
      ErrorCodes.VALIDATION_INVALID_INPUT,
      "partnerId is required",
      400,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
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

  // Get partner details
  const { data: partner, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .eq("org_id", userData.org_id)
    .single();

  if (error || !partner) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Partner not found", 404);
  }

  // Extract qualification data from metadata
  const qualificationResult = partner.metadata?.qualificationResult || null;
  const fitBreakdown = partner.fit_breakdown || null;

  // Build structured response
  const qualification = qualificationResult
    ? {
        fit_score: partner.fit_score || 0,
        breakdown: fitBreakdown || {
          audience_overlap: 50,
          product_fit: 50,
          brand_alignment: 50,
          market_reach: 50,
        },
        strengths: qualificationResult.strengths || [],
        concerns: qualificationResult.concerns || [],
        recommendation: qualificationResult.recommendation || "maybe",
        reasoning: qualificationResult.reasoning || "",
      }
    : null;

  return apiSuccess({
    partner: {
      id: partner.id,
      name: partner.name,
      type: partner.type,
      status: partner.status,
      fitScore: partner.fit_score || 0,
      website: partner.website,
      linkedinUrl: partner.linkedin_url,
      logoUrl: partner.logo_url,
      contactPerson: partner.metadata?.contactPerson || null,
      description: partner.metadata?.description || null,
      industry: partner.metadata?.industry || null,
      updatedAt: partner.updated_at,
    },
    qualification,
  });
});
