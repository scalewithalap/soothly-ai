import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { createOrganizationSchema } from "@/lib/validation/schemas";

// POST: Setup/Update organization
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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

  // Validate request body
  const { name, industry, size } = await validateBody(
    request,
    createOrganizationSchema
  );

  // Update organization
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name,
      industry: industry || null,
      company_size: size || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.org_id);

  if (updateError) {
    console.error("Failed to update organization:", updateError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update organization",
      500
    );
  }

  return apiSuccess({ success: true });
});
