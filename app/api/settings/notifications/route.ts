import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UpdateSchema = z.object({
  // Channel configurations
  discord_webhook_url: z.string().url().optional().nullable(),
  slack_webhook_url: z.string().url().optional().nullable(),
  telegram_bot_token: z.string().optional().nullable(),
  telegram_chat_id: z.string().optional().nullable(),
  jira_base_url: z.string().url().optional().nullable(),
  jira_email: z.string().email().optional().nullable(),
  jira_api_token: z.string().optional().nullable(),
  jira_project_key: z.string().optional().nullable(),

  // Channel enable flags
  email_enabled: z.boolean().optional(),
  discord_enabled: z.boolean().optional(),
  slack_enabled: z.boolean().optional(),
  telegram_enabled: z.boolean().optional(),
  jira_enabled: z.boolean().optional(),

  // Notification preferences
  notify_agent_completion: z.boolean().optional(),
  notify_agent_errors: z.boolean().optional(),
  notify_weekly_report: z.boolean().optional(),
  notify_security_alerts: z.boolean().optional(),
  notify_team_invites: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get or create notification settings
    const result = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let settings = result.data;
    const error = result.error;

    if (error?.code === "PGRST116") {
      // No settings found, get org_id and create defaults
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        const { data: newSettings, error: insertError } = await supabase
          .from("notification_settings")
          .insert({
            user_id: user.id,
            org_id: userData.org_id,
          })
          .select("*")
          .single();

        if (insertError) {
          console.error("Failed to create settings:", insertError);
          return NextResponse.json(
            { error: "internal/create_failed" },
            { status: 500 },
          );
        }
        settings = newSettings;
      }
    } else if (error) {
      console.error("Failed to fetch settings:", error);
      return NextResponse.json(
        { error: "internal/fetch_failed" },
        { status: 500 },
      );
    }

    // Mask sensitive fields
    if (settings) {
      if (settings.discord_webhook_url) {
        settings.discord_webhook_url = maskUrl(settings.discord_webhook_url);
      }
      if (settings.slack_webhook_url) {
        settings.slack_webhook_url = maskUrl(settings.slack_webhook_url);
      }
      if (settings.telegram_bot_token) {
        settings.telegram_bot_token = "••••••••";
      }
      if (settings.jira_api_token) {
        settings.jira_api_token = "••••••••";
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Notification settings API error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = UpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "validation/invalid_input",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    // Filter out unchanged masked values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parseResult.data)) {
      if (
        value !== undefined &&
        value !== "••••••••" &&
        !String(value).includes("••••")
      ) {
        updates[key] = value;
      }
    }

    // Upsert settings
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: "auth/no_organization" },
        { status: 403 },
      );
    }

    const { error: upsertError } = await supabase
      .from("notification_settings")
      .upsert(
        {
          user_id: user.id,
          org_id: userData.org_id,
          ...updates,
        } as any,
        { onConflict: "user_id" },
      );

    if (upsertError) {
      console.error("Failed to update settings:", upsertError);
      return NextResponse.json(
        { error: "internal/update_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification settings update error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.length > 20) {
      return `${parsed.origin}/••••${path.slice(-8)}`;
    }
    return `${parsed.origin}/••••••••`;
  } catch {
    return "••••••••";
  }
}

