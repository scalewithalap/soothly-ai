-- ============================================================================
-- Migration: 008_create_notification_settings
-- Description: Creates notification_settings table for user notification preferences
-- ============================================================================

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Channel configurations
  email_enabled BOOLEAN DEFAULT true,
  discord_enabled BOOLEAN DEFAULT false,
  discord_webhook_url TEXT,
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  jira_enabled BOOLEAN DEFAULT false,
  jira_base_url TEXT,
  jira_project_key TEXT,
  jira_email TEXT,
  jira_api_token TEXT,
  
  -- Event type preferences
  notify_agent_completion BOOLEAN DEFAULT true,
  notify_agent_errors BOOLEAN DEFAULT true,
  notify_weekly_report BOOLEAN DEFAULT true,
  notify_security_alerts BOOLEAN DEFAULT true,
  notify_team_invites BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT notification_settings_user_unique UNIQUE (user_id)
);

-- Performance indexes
CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_org ON notification_settings(org_id);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification settings"
  ON notification_settings FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notification_settings;
