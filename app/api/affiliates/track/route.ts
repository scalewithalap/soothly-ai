/**
 * Track Referral API
 * POST: Track a referral click from ?ref= parameter
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackReferralVisit } from "@/lib/affiliates/tracking";

const trackSchema = z.object({
  code: z.string().min(1),
  landing_page: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = trackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "validation/invalid_input" } },
        { status: 400 },
      );
    }

    // Get IP and User Agent
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await trackReferralVisit(parsed.data.code, {
      landingPage: parsed.data.landing_page,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ tracked: result.tracked });
  } catch (error) {
    console.error("Track API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}

