"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WidgetConfigCardProps {
  orgId?: string;
}

export function WidgetConfigCard({ orgId }: WidgetConfigCardProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [widgetSecret, setWidgetSecret] = useState<string | null>(null);
  const [dataEndpoint, setDataEndpoint] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", orgId)
        .single();

      if (data?.settings) {
        const settings = data.settings as Record<string, unknown>;
        setWidgetSecret((settings.widget_secret as string) || null);
        setDataEndpoint((settings.widget_data_endpoint as string) || "");
      }
    } catch (error) {
      console.error("Failed to fetch widget settings:", error);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const generateSecret = () => {
    // Generate a secure random secret
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const newSecret = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setWidgetSecret(newSecret);
    toast.info("New secret generated. Remember to save your changes.");
  };

  const copySecret = async () => {
    if (!widgetSecret) return;
    await navigator.clipboard.writeText(widgetSecret);
    toast.success("Secret copied to clipboard");
  };

  const saveSettings = async () => {
    if (!orgId) return;

    try {
      setSaving(true);
      const res = await fetch("/api/settings/organization/widget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widget_secret: widgetSecret,
          widget_data_endpoint: dataEndpoint,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast.success("Widget settings saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Widget Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure the embeddable support widget for your customers
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Widget Secret */}
        <div className="space-y-2">
          <Label htmlFor="widget_secret">Widget Secret</Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Used to sign user identity for widget authentication. Keep this
            secret!
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="widget_secret"
                type={showSecret ? "text" : "password"}
                value={widgetSecret || ""}
                onChange={(e) => setWidgetSecret(e.target.value)}
                placeholder="Generate or enter a secret..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copySecret}
              disabled={!widgetSecret}
              title="Copy secret"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={generateSecret}
              title="Generate new secret"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Data Endpoint */}
        <div className="space-y-2">
          <Label htmlFor="widget_data_endpoint">Data Endpoint (Optional)</Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your API endpoint that the widget can call to fetch custom user data
            (e.g., credits, order status)
          </p>
          <Input
            id="widget_data_endpoint"
            type="url"
            value={dataEndpoint}
            onChange={(e) => setDataEndpoint(e.target.value)}
            placeholder="https://api.yourapp.com/widget-data"
          />
        </div>

        {/* Usage Instructions */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Integration Code
          </h4>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
            {`<script
  src="${typeof window !== "undefined" ? window.location.origin : "https://zeroheadache.co"}/widget.js"
  data-org-id="${orgId || "YOUR_ORG_ID"}"
  data-user-id="USER_ID"
  data-signature="HMAC_SIGNATURE"
  data-timestamp="UNIX_TIMESTAMP"
></script>`}
          </pre>
        </div>

        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Widget Settings"}
        </Button>
      </div>
    </Card>
  );
}
