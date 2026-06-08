/**
 * MFA Enrollment API
 *
 * POST: Start TOTP enrollment for authenticated user
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Tiers that can use MFA (Starter and above)
const MFA_ALLOWED_TIERS = ["starter", "growth", "scale", "enterprise"];

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
  }

  try {
    // Use service role client for subscription check (untyped table)
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Check user's subscription tier
    const { data: profile } = await adminClient
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profile?.org_id) {
      const { data: subscription } = await adminClient
        .from("subscriptions")
        .select("plan_id")
        .eq("org_id", profile.org_id)
        .eq("status", "active")
        .single();

      const tier = (subscription?.plan_id as string)?.toLowerCase() || "free";

      if (!MFA_ALLOWED_TIERS.includes(tier)) {
        return NextResponse.json(
          {
            error: "mfa/tier_required",
            message: "Upgrade to Starter or higher to enable MFA",
            allowed_tiers: MFA_ALLOWED_TIERS,
          },
          { status: 403 },
        );
      }
    }

    // Start TOTP enrollment
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (error) {
      console.error("MFA enrollment error:", error);
      return NextResponse.json(
        { error: "mfa/enrollment_failed", message: error.message },
        { status: 400 },
      );
    }

    // Return QR code and secret for user to scan
    return NextResponse.json({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (error) {
    console.error("MFA enrollment error:", error);
    return NextResponse.json(
      { error: "mfa/enrollment_failed" },
      { status: 500 },
    );
  }
}

