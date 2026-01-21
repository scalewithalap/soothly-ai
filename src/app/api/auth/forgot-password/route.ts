import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// POST: Request password reset
export const POST = withErrorHandler(async (request: Request) => {
  // Validate request body
  const { email } = await validateBody(request, forgotPasswordSchema);
  const normalizedEmail = email.toLowerCase();

  // Find user (case-insensitive)
  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", normalizedEmail)
    .single();

  // Always return success to prevent email enumeration
  if (!user) {
    return apiSuccess({
      success: true,
      message: "If this email exists, a password reset link has been sent",
    });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate any existing tokens for this user
  await supabase
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("user_id", user.id)
    .eq("used", false);

  // Create new token
  const { error: insertError } = await supabase
    .from("password_reset_tokens")
    .insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to create reset token",
      500,
    );
  }

  // Build reset URL
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  // TODO: Send email using your email service
  // await sendPasswordResetEmail(email, resetUrl);

  return apiSuccess({
    success: true,
    message: "If this email exists, a password reset link has been sent",
  });
});
