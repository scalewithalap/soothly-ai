/**
 * Notification Settings Helper
 * Fetches user notification preferences for use in Inngest functions
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { NotificationChannel, NotificationConfig } from "./providers";

export interface UserNotificationPreferences {
  channels: NotificationChannel[];
  config: NotificationConfig;
  eventPreferences: {
    agentCompletion: boolean;
    agentErrors: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
    teamInvites: boolean;
  };
}

/**
 * Get notification preferences for a user
 * Falls back to email-only if no settings exist
 */
export async function getUserNotificationPreferences(
  userId: string,
): Promise<UserNotificationPreferences> {
  const supabase = createSupabaseAdminClient();

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Default preferences if none exist
  if (!settings) {
    return {
      channels: ["email"],
      config: {},
      eventPreferences: {
        agentCompletion: true,
        agentErrors: true,
        weeklyReport: true,
        securityAlerts: true,
        teamInvites: true,
      },
    };
  }

  // Build enabled channels array
  const channels: NotificationChannel[] = [];

  if (settings.email_enabled) {
    channels.push("email");
  }
  if (settings.discord_enabled && settings.discord_webhook_url) {
    channels.push("discord");
  }
  if (settings.slack_enabled && settings.slack_webhook_url) {
    channels.push("slack");
  }
  if (
    settings.telegram_enabled &&
    settings.telegram_bot_token &&
    settings.telegram_chat_id
  ) {
    channels.push("telegram");
  }
  if (
    settings.jira_enabled &&
    settings.jira_base_url &&
    settings.jira_api_token
  ) {
    channels.push("jira");
  }

  // Fallback to email if nothing enabled
  if (channels.length === 0) {
    channels.push("email");
  }

  // Build config object
  const config: NotificationConfig = {};

  if (settings.discord_webhook_url) {
    config.discord = { webhookUrl: settings.discord_webhook_url };
  }
  if (settings.slack_webhook_url) {
    config.slack = { webhookUrl: settings.slack_webhook_url };
  }
  if (settings.telegram_bot_token && settings.telegram_chat_id) {
    config.telegram = {
      botToken: settings.telegram_bot_token,
      chatId: settings.telegram_chat_id,
    };
  }
  if (
    settings.jira_base_url &&
    settings.jira_email &&
    settings.jira_api_token &&
    settings.jira_project_key
  ) {
    config.jira = {
      baseUrl: settings.jira_base_url,
      email: settings.jira_email,
      apiToken: settings.jira_api_token,
      projectKey: settings.jira_project_key,
    };
  }

  return {
    channels,
    config,
    eventPreferences: {
      agentCompletion: settings.notify_agent_completion ?? true,
      agentErrors: settings.notify_agent_errors ?? true,
      weeklyReport: settings.notify_weekly_report ?? true,
      securityAlerts: settings.notify_security_alerts ?? true,
      teamInvites: settings.notify_team_invites ?? true,
    },
  };
}

/**
 * Get notification preferences for an organization owner
 * This is a convenience wrapper that first finds the org owner
 */
export async function getOrgOwnerNotificationPreferences(
  orgId: string,
): Promise<{
  userId: string;
  preferences: UserNotificationPreferences;
} | null> {
  const supabase = createSupabaseAdminClient();

  // Get the org owner (first user with admin role or oldest member)
  const { data: owner } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!owner) {
    return null;
  }

  const preferences = await getUserNotificationPreferences(owner.id);

  return {
    userId: owner.id,
    preferences,
  };
}

