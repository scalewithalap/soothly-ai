import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

const discoverPartnersSchema = z.object({
  industry: z.string().min(2, "Industry must be at least 2 characters"),
  partner_type: z
    .enum([
      "affiliate",
      "reseller",
      "integration",
      "referral",
      "strategic",
      "other",
    ])
    .default("affiliate"),
});

// GET /api/agents/partners - List partners for current org
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: partners, error } = await supabase
    .from("partners")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching partners:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch partners",
      500
    );
  }

  return apiSuccess({ partners });
});

// POST /api/agents/partners - Trigger partner discovery
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Validate request body
  const parsed = await validateBody(request, discoverPartnersSchema);

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Trigger Inngest event for background partner discovery
  await inngest.send({
    name: "partners/discover.requested",
    data: {
      industry: parsed.industry,
      partnerType: parsed.partner_type,
      orgId: userData.org_id,
    },
  });

  return apiSuccess(
    { message: "Discovery started", industry: parsed.industry },
    202
  );
});
