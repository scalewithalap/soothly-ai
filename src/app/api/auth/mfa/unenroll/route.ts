/**
 * MFA Unenroll API
 *
 * DELETE: Remove MFA factor from user account
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const factorId = searchParams.get("factorId");

    if (!factorId) {
      return NextResponse.json(
        { error: "validation/missing_factor_id" },
        { status: 400 },
      );
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      console.error("MFA unenroll error:", error);
      return NextResponse.json(
        { error: "mfa/unenroll_failed", message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "MFA successfully disabled",
    });
  } catch (error) {
    console.error("MFA unenroll error:", error);
    return NextResponse.json({ error: "mfa/unenroll_failed" }, { status: 500 });
  }
}

/**
 * GET: List user's MFA factors
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      return NextResponse.json(
        { error: "mfa/list_failed", message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      factors: data.totp || [],
      hasMfa: (data.totp?.length || 0) > 0,
    });
  } catch (error) {
    console.error("MFA list error:", error);
    return NextResponse.json({ error: "mfa/list_failed" }, { status: 500 });
  }
}

