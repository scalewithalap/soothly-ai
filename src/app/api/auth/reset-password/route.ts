import { createClient } from "@supabase/supabase-js";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { resetPasswordSchema } from "@/lib/validation/schemas";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Reset password using token
export const POST = withErrorHandler(async (request: Request) => {
  // Validate request body
  const { token, password } = await validateBody(request, resetPasswordSchema);

  // Find valid token
  const { data: resetToken, error: tokenError } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used")
    .eq("token", token)
    .single();

  if (tokenError || !resetToken) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid or expired reset token",
      400
    );
  }

  // Check if token is already used
  if (resetToken.used) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "This reset link has already been used",
      400
    );
  }

  // Check if token is expired
  if (new Date(resetToken.expires_at) < new Date()) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "This reset link has expired",
      400
    );
  }

  // Get user's email from users table
  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", resetToken.user_id)
    .single();

  if (!user) {
    throw new AppError(ErrorCodes.NOT_FOUND, "User not found", 404);
  }

  // Update password using Supabase Admin API
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    resetToken.user_id,
    { password }
  );

  if (updateError) {
    console.error("Password update error:", updateError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update password",
      500
    );
  }

  // Mark token as used
  await supabase
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("id", resetToken.id);

  return apiSuccess({
    success: true,
    message: "Password reset successfully",
  });
});
