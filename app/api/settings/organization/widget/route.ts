/**
 * Widget Settings API Route
 *
 * @route PATCH /api/settings/organization/widget
 * Saves widget configuration to organization settings
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { z } from "zod";

const WidgetSettingsSchema = z.object({
  widget_secret: z.string().min(32).max(128).nullable(),
  widget_data_endpoint: z.string().url().or(z.literal("")).nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const { orgId } = authResult;
    const body = await request.json();
    const parseResult = WidgetSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { widget_secret, widget_data_endpoint } = parseResult.data;
    const supabase = await createClient();

    // Get current settings
    const { data: org, error: fetchError } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch organization" },
        { status: 500 },
      );
    }

    // Merge new widget settings with existing settings
    const currentSettings = (org?.settings || {}) as Record<string, unknown>;
    const updatedSettings = {
      ...currentSettings,
      widget_secret: widget_secret || undefined,
      widget_data_endpoint: widget_data_endpoint || undefined,
    };

    // Remove undefined values
    if (!widget_secret) delete updatedSettings.widget_secret;
    if (!widget_data_endpoint) delete updatedSettings.widget_data_endpoint;

    // Update organization
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ settings: updatedSettings })
      .eq("id", orgId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Widget settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
