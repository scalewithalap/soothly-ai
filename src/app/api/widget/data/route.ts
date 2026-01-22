/**
 * Widget Custom Data API
 *
 * Per connection-architecture.md - Layer 2: Remote Functions
 * Proxies requests to customer's registered data endpoint
 *
 * @route POST /api/widget/data
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// Request schema
const DataRequestSchema = z.object({
  sessionToken: z.string().min(1),
  intent: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

// Get untyped client for tables not in generated types
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = DataRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { sessionToken, intent, params } = parseResult.data;
    const supabase = getUntypedClient();

    // Validate session token from our custom widget_auth_sessions table
    const { data: session, error: sessionError } = await supabase
      .from("widget_auth_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // Get organization settings
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.org_id)
      .single();

    const orgSettings = (org?.settings || {}) as Record<string, unknown>;
    const dataEndpoint = orgSettings.widget_data_endpoint as string;

    if (!dataEndpoint) {
      return NextResponse.json(
        { error: "No data endpoint configured for this organization" },
        { status: 400 },
      );
    }

    // Call customer's data endpoint
    const response = await fetch(dataEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Widget-User-Id": session.external_user_id,
        "X-Widget-Org-Id": session.org_id,
        "X-Widget-Intent": intent,
      },
      body: JSON.stringify({
        userId: session.external_user_id,
        intent,
        params: params || {},
      }),
    });

    if (!response.ok) {
      console.error(
        `Customer endpoint returned ${response.status}: ${await response.text()}`,
      );
      return NextResponse.json(
        { error: "Failed to fetch data from customer endpoint" },
        { status: 502 },
      );
    }

    const data = await response.json();

    // Log the data request for auditing (optional - use activities table)
    await supabase.from("activities").insert({
      org_id: session.org_id,
      action: "widget_data_request",
      entity_type: "widget",
      entity_id: sessionToken.substring(0, 8),
      description: `Widget data request: ${intent}`,
      metadata: { intent, params: params || {} },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Widget data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
