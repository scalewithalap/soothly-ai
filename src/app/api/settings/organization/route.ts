import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { updateOrganizationSchema } from "@/lib/validation/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/settings/organization - Get current organization
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

  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      "id, name, subscription_tier, credits_balance, credits_limit, created_at"
    )
    .eq("id", userData.org_id)
    .single();

  if (error) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch organization",
      500
    );
  }

  return apiSuccess({ organization: org });
});

// PATCH /api/settings/organization - Update organization
export const PATCH = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Only owners and admins can update org settings
  if (!["owner", "admin"].includes(userData.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403
    );
  }

  // Validate request body
  const { name } = await validateBody(request, updateOrganizationSchema);

  const { data: org, error } = await supabase
    .from("organizations")
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.org_id)
    .select()
    .single();

  if (error) {
    console.error("Organization update error:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update organization",
      500
    );
  }

  return apiSuccess({ organization: org });
});

