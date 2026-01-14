import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Resend verification email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "validation/email_required" },
        { status: 400 }
      );
    }

    // Find user
    const { data: user } = await supabase
      .from("users")
      .select("id, email, email_verified")
      .eq("email", email.toLowerCase())
      .single();

    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: "If this email exists, a verification link has been sent",
      });
    }

    if (user.email_verified) {
      return NextResponse.json(
        { error: "auth/already_verified" },
        { status: 400 }
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

    // TODO: Send email using your email service
    // For now, log the URL (in production, use AWS SES or similar)
    console.log(`Verification URL for ${email}: ${verifyUrl}`);

    // In production, send email:
    // await sendVerificationEmail(email, verifyUrl);

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
