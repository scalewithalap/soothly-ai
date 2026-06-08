import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { changePasswordSchema } from "@/lib/validation/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

// POST /api/settings/profile/password - Change password
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Validate request body
  const { newPassword } = await validateBody(request, changePasswordSchema);

  // Note: Supabase doesn't have a direct "verify current password" method
  // In production, you might need to re-authenticate the user first
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Password change error:", error);
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Failed to change password. Please try again.",
      400
    );
  }

  return apiSuccess({ success: true });
});

