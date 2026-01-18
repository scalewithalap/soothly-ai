/**
 * MFA Verify API
 *
 * POST: Verify TOTP code to complete enrollment or authenticate
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const verifySchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().length(6),
  challengeId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { factorId, code, challengeId } = verifySchema.parse(body);

    // If challengeId provided, this is an auth challenge verification
    // Otherwise, this is enrollment verification
    if (challengeId) {
      // Verify challenge (during login)
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) {
        return NextResponse.json(
          { error: "mfa/invalid_code", message: error.message },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, session: data });
    } else {
      // Create and verify challenge (for enrollment)
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        return NextResponse.json(
          { error: "mfa/challenge_failed", message: challengeError.message },
          { status: 400 },
        );
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        return NextResponse.json(
          { error: "mfa/invalid_code", message: verifyError.message },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "MFA successfully enabled",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input" },
        { status: 400 },
      );
    }
    console.error("MFA verify error:", error);
    return NextResponse.json({ error: "mfa/verify_failed" }, { status: 500 });
  }
}

