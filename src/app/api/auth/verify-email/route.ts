import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Verify email using token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", request.url)
      );
    }

    // Find user with this token
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, verification_token, verification_expires")
      .eq("verification_token", token)
      .single();

    if (error || !user) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", request.url)
      );
    }

    // Check if token expired
    if (
      user.verification_expires &&
      new Date(user.verification_expires) < new Date()
    ) {
      return NextResponse.redirect(
        new URL("/login?error=token_expired", request.url)
      );
    }

    // Mark user as verified
    await supabase
      .from("users")
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Redirect to success page
    return NextResponse.redirect(new URL("/login?verified=true", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      new URL("/login?error=verification_failed", request.url)
    );
  }
}
