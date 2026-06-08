/**
 * Widget Identity Verification API
 *
 * Per connection-architecture.md - Layer 2: Authenticated Widget
 * Verifies HMAC-signed user identity for embedded support widget
 *
 * @route POST /api/widget/verify
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// Request schema
const VerifyRequestSchema = z.object({
  userId: z.string().min(1),
  signature: z.string().min(1),
  timestamp: z.number().int().positive(),
  orgId: z.string().uuid(),
});

// Maximum age of signature in seconds (5 minutes for replay protection)
const MAX_SIGNATURE_AGE_SECONDS = 300;

// Get untyped client for tables not in generated types
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Verify HMAC signature
 */
function verifySignature(
  userId: string,
  timestamp: number,
  signature: string,
  secretKey: string,
): boolean {
  const payload = `${userId}:${timestamp}`;
  const expectedSignature = createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate widget session token
 */
function generateSessionToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = VerifyRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid request body",
          issues: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { userId, signature, timestamp, orgId } = parseResult.data;

    // Check timestamp freshness (replay protection)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureAge = currentTime - timestamp;

    if (signatureAge > MAX_SIGNATURE_AGE_SECONDS || signatureAge < 0) {
      return NextResponse.json(
        {
          valid: false,
          error: "Signature expired or invalid timestamp",
        },
        { status: 401 },
      );
    }

    const supabase = getUntypedClient();

    // Get organization's widget secret key
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { valid: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const widgetSecret = (org.settings as Record<string, unknown>)
      ?.widget_secret as string;

    if (!widgetSecret) {
      return NextResponse.json(
        { valid: false, error: "Widget not configured for this organization" },
        { status: 400 },
      );
    }

    const isValid = verifySignature(userId, timestamp, signature, widgetSecret);

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: "Invalid signature" },
        { status: 401 },
      );
    }

    // Generate session token for the widget
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store session in our custom table
    await supabase.from("widget_auth_sessions").insert({
      org_id: orgId,
      external_user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      metadata: {
        verified_at: new Date().toISOString(),
        user_agent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      valid: true,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Widget verification error:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
