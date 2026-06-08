import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { sendNotificationEmail } from "@/lib/email/service";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// POST: Resend verification email
export const POST = withErrorHandler(async (request: Request) => {
  // Validate request body (reusing email schema)
  const { email } = await validateBody(request, forgotPasswordSchema);
  const normalizedEmail = email.toLowerCase();

  // Find user
  const { data: user } = await supabase
    .from("users")
    .select("id, email, email_verified, full_name")
    .eq("email", normalizedEmail)
    .single();

  if (!user) {
    // Don't reveal if email exists
    return apiSuccess({
      success: true,
      message: "If this email exists, a verification link has been sent",
    });
  }

  if (user.email_verified) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Email is already verified",
      400,
    );
  }

  // Generate new verification token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await supabase
    .from("users")
    .update({
      verification_token: token,
      verification_expires: expires.toISOString(),
    })
    .eq("id", user.id);

  // Send verification email
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;

  await sendNotificationEmail({
    email: normalizedEmail,
    title: "Verify your email address",
    message: `Hi ${user.full_name || "there"}! Please verify your email address to complete your registration and start using Soothly AI.`,
    actionUrl: verifyUrl,
    actionLabel: "Verify Email",
  });

  return apiSuccess({
    success: true,
    message: "Verification email sent",
  });
});
