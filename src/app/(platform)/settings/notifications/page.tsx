"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  MessageSquare,
  Zap,
  FileText,
  Users,
  AlertTriangle,
  Hash,
  Send,
  Ticket,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { useContent } from "@/hooks/use-content";

interface NotificationSettings {
  // Channel configs
  discord_webhook_url: string | null;
  slack_webhook_url: string | null;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  jira_base_url: string | null;
  jira_email: string | null;
  jira_api_token: string | null;
  jira_project_key: string | null;

  // Channel flags
  email_enabled: boolean;
  discord_enabled: boolean;
  slack_enabled: boolean;
  telegram_enabled: boolean;
  jira_enabled: boolean;

  // Notification prefs
  notify_agent_completion: boolean;
  notify_agent_errors: boolean;
  notify_weekly_report: boolean;
  notify_security_alerts: boolean;
  notify_team_invites: boolean;
}

const defaultSettings: NotificationSettings = {
  discord_webhook_url: null,
  slack_webhook_url: null,
  telegram_bot_token: null,
  telegram_chat_id: null,
  jira_base_url: null,
  jira_email: null,
  jira_api_token: null,
  jira_project_key: null,
  email_enabled: true,
  discord_enabled: false,
  slack_enabled: false,
  telegram_enabled: false,
  jira_enabled: false,
  notify_agent_completion: true,
  notify_agent_errors: true,
  notify_weekly_report: true,
  notify_security_alerts: true,
  notify_team_invites: true,
};

export default function NotificationsSettingsPage() {
  const { content } = useContent();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] =
    useState<NotificationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings({ ...defaultSettings, ...data.settings });
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleChannel = (channel: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success(content.settings.notifications.successMessage);
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast.error(content.settings.notifications.errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Email Notifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Mail className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {content.settings.notifications.emailTitle}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {content.settings.notifications.emailDesc}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.email_enabled}
            onCheckedChange={(v) => updateSetting("email_enabled", v)}
          />
        </div>
      </Card>

      {/* Discord */}
      <Card className="p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleChannel("discord")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Hash className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Discord
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send notifications to a Discord channel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings.discord_enabled ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            {expandedChannels.has("discord") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {expandedChannels.has("discord") && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Enable Discord Notifications</Label>
              <Switch
                checked={settings.discord_enabled}
                onCheckedChange={(v) => updateSetting("discord_enabled", v)}
              />
            </div>
            <div>
              <Label htmlFor="discord-webhook">Webhook URL</Label>
              <Input
                id="discord-webhook"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discord_webhook_url || ""}
                onChange={(e) =>
                  updateSetting("discord_webhook_url", e.target.value || null)
                }
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Slack */}
      <Card className="p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleChannel("slack")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Slack
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send notifications to a Slack channel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings.slack_enabled ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            {expandedChannels.has("slack") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {expandedChannels.has("slack") && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Enable Slack Notifications</Label>
              <Switch
                checked={settings.slack_enabled}
                onCheckedChange={(v) => updateSetting("slack_enabled", v)}
              />
            </div>
            <div>
              <Label htmlFor="slack-webhook">Webhook URL</Label>
              <Input
                id="slack-webhook"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={settings.slack_webhook_url || ""}
                onChange={(e) =>
                  updateSetting("slack_webhook_url", e.target.value || null)
                }
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Telegram */}
      <Card className="p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleChannel("telegram")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Telegram
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send notifications via Telegram Bot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings.telegram_enabled ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            {expandedChannels.has("telegram") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {expandedChannels.has("telegram") && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Enable Telegram Notifications</Label>
              <Switch
                checked={settings.telegram_enabled}
                onCheckedChange={(v) => updateSetting("telegram_enabled", v)}
              />
            </div>
            <div>
              <Label htmlFor="telegram-token">Bot Token</Label>
              <Input
                id="telegram-token"
                type="password"
                placeholder="123456:ABC-DEF..."
                value={settings.telegram_bot_token || ""}
                onChange={(e) =>
                  updateSetting("telegram_bot_token", e.target.value || null)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="telegram-chat">Chat ID</Label>
              <Input
                id="telegram-chat"
                placeholder="-1001234567890"
                value={settings.telegram_chat_id || ""}
                onChange={(e) =>
                  updateSetting("telegram_chat_id", e.target.value || null)
                }
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Jira */}
      <Card className="p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleChannel("jira")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Jira
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Jira issues for agent alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings.jira_enabled ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            {expandedChannels.has("jira") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {expandedChannels.has("jira") && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Enable Jira Integration</Label>
              <Switch
                checked={settings.jira_enabled}
                onCheckedChange={(v) => updateSetting("jira_enabled", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jira-url">Jira URL</Label>
                <Input
                  id="jira-url"
                  type="url"
                  placeholder="https://yourcompany.atlassian.net"
                  value={settings.jira_base_url || ""}
                  onChange={(e) =>
                    updateSetting("jira_base_url", e.target.value || null)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="jira-project">Project Key</Label>
                <Input
                  id="jira-project"
                  placeholder="PROJ"
                  value={settings.jira_project_key || ""}
                  onChange={(e) =>
                    updateSetting("jira_project_key", e.target.value || null)
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="jira-email">Email</Label>
              <Input
                id="jira-email"
                type="email"
                placeholder="you@company.com"
                value={settings.jira_email || ""}
                onChange={(e) =>
                  updateSetting("jira_email", e.target.value || null)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="jira-token">API Token</Label>
              <Input
                id="jira-token"
                type="password"
                placeholder="••••••••"
                value={settings.jira_api_token || ""}
                onChange={(e) =>
                  updateSetting("jira_api_token", e.target.value || null)
                }
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notification Types
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose which events trigger notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-gray-400" />
              <div>
                <Label>
                  {content.settings.notifications.fields.agentCompletion.label}
                </Label>
                <p className="text-xs text-gray-500">
                  {content.settings.notifications.fields.agentCompletion.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_agent_completion}
              onCheckedChange={(v) =>
                updateSetting("notify_agent_completion", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <div>
                <Label>
                  {content.settings.notifications.fields.agentErrors.label}
                </Label>
                <p className="text-xs text-gray-500">
                  {content.settings.notifications.fields.agentErrors.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_agent_errors}
              onCheckedChange={(v) => updateSetting("notify_agent_errors", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <Label>
                  {content.settings.notifications.fields.weeklyReport.label}
                </Label>
                <p className="text-xs text-gray-500">
                  {content.settings.notifications.fields.weeklyReport.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_weekly_report}
              onCheckedChange={(v) => updateSetting("notify_weekly_report", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div>
                <Label>
                  {content.settings.notifications.fields.securityAlerts.label}
                </Label>
                <p className="text-xs text-gray-500">
                  {content.settings.notifications.fields.securityAlerts.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_security_alerts}
              onCheckedChange={(v) =>
                updateSetting("notify_security_alerts", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <Label>
                  {content.settings.notifications.fields.teamInvites.label}
                </Label>
                <p className="text-xs text-gray-500">
                  {content.settings.notifications.fields.teamInvites.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_team_invites}
              onCheckedChange={(v) => updateSetting("notify_team_invites", v)}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving
            ? content.settings.notifications.savingButton
            : content.settings.notifications.saveButton}
        </Button>
      </div>
    </div>
  );
}
