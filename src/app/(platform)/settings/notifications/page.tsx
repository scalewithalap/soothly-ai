"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Zap,
  FileText,
  Users,
  AlertTriangle,
} from "lucide-react";

interface NotificationPreferences {
  email: {
    agentCompletion: boolean;
    agentErrors: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
    teamInvites: boolean;
  };
  sms: {
    agentErrors: boolean;
    securityAlerts: boolean;
  };
  inApp: {
    allNotifications: boolean;
    soundEnabled: boolean;
  };
}

const defaultPreferences: NotificationPreferences = {
  email: {
    agentCompletion: true,
    agentErrors: true,
    weeklyReport: true,
    securityAlerts: true,
    teamInvites: true,
  },
  sms: {
    agentErrors: false,
    securityAlerts: true,
  },
  inApp: {
    allNotifications: true,
    soundEnabled: false,
  },
};

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load preferences (mock for now)
    setLoading(false);
  }, []);

  const updatePreference = <K extends keyof NotificationPreferences>(
    category: K,
    key: keyof NotificationPreferences[K],
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      // TODO: Save to API
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Mail className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Notifications
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage which emails you receive
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="email-completion">Agent Completion</Label>
                <p className="text-xs text-gray-500">
                  When an agent finishes a task
                </p>
              </div>
            </div>
            <Switch
              id="email-completion"
              checked={preferences.email.agentCompletion}
              onCheckedChange={(v: boolean) =>
                updatePreference("email", "agentCompletion", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="email-errors">Agent Errors</Label>
                <p className="text-xs text-gray-500">
                  When an agent encounters an error
                </p>
              </div>
            </div>
            <Switch
              id="email-errors"
              checked={preferences.email.agentErrors}
              onCheckedChange={(v: boolean) =>
                updatePreference("email", "agentErrors", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="email-weekly">Weekly Report</Label>
                <p className="text-xs text-gray-500">
                  Summary of agent activity
                </p>
              </div>
            </div>
            <Switch
              id="email-weekly"
              checked={preferences.email.weeklyReport}
              onCheckedChange={(v: boolean) =>
                updatePreference("email", "weeklyReport", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="email-team">Team Invitations</Label>
                <p className="text-xs text-gray-500">
                  When you&apos;re invited to a team
                </p>
              </div>
            </div>
            <Switch
              id="email-team"
              checked={preferences.email.teamInvites}
              onCheckedChange={(v: boolean) =>
                updatePreference("email", "teamInvites", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div>
                <Label htmlFor="email-security">Security Alerts</Label>
                <p className="text-xs text-gray-500">
                  Login from new device, etc.
                </p>
              </div>
            </div>
            <Switch
              id="email-security"
              checked={preferences.email.securityAlerts}
              onCheckedChange={(v: boolean) =>
                updatePreference("email", "securityAlerts", v)
              }
            />
          </div>
        </div>
      </Card>

      {/* SMS/WhatsApp Notifications */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SMS & WhatsApp
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Urgent notifications via text
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="sms-errors">Critical Errors</Label>
                <p className="text-xs text-gray-500">Agent failures only</p>
              </div>
            </div>
            <Switch
              id="sms-errors"
              checked={preferences.sms.agentErrors}
              onCheckedChange={(v: boolean) =>
                updatePreference("sms", "agentErrors", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div>
                <Label htmlFor="sms-security">Security Alerts</Label>
                <p className="text-xs text-gray-500">
                  Suspicious activity detected
                </p>
              </div>
            </div>
            <Switch
              id="sms-security"
              checked={preferences.sms.securityAlerts}
              onCheckedChange={(v: boolean) =>
                updatePreference("sms", "securityAlerts", v)
              }
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            SMS/WhatsApp notifications require phone number verification in your
            profile.
          </p>
        </div>
      </Card>

      {/* In-App Notifications */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              In-App Notifications
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Desktop and browser notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="inapp-all">All Notifications</Label>
                <p className="text-xs text-gray-500">
                  Show in notification center
                </p>
              </div>
            </div>
            <Switch
              id="inapp-all"
              checked={preferences.inApp.allNotifications}
              onCheckedChange={(v: boolean) =>
                updatePreference("inApp", "allNotifications", v)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <div>
                <Label htmlFor="inapp-sound">Sound Effects</Label>
                <p className="text-xs text-gray-500">
                  Play sound for notifications
                </p>
              </div>
            </div>
            <Switch
              id="inapp-sound"
              checked={preferences.inApp.soundEnabled}
              onCheckedChange={(v: boolean) =>
                updatePreference("inApp", "soundEnabled", v)
              }
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
