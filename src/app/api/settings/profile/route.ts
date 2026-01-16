import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { updateProfileSchema } from "@/lib/validation/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/settings/profile - Get current user profile
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch profile",
      500
    );
  }

  return apiSuccess({ profile });
});

// PATCH /api/settings/profile - Update user profile
export const PATCH = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Validate request body
  const { full_name } = await validateBody(request, updateProfileSchema);

  const { data: profile, error } = await supabase
    .from("users")
    .update({
      full_name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Profile update error:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update profile",
      500
    );
  }

  return apiSuccess({ profile });
});
