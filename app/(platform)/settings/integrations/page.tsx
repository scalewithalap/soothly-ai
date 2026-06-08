"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plug, Key, Copy, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContent } from "@/hooks/use-content";
import WebhookManager from "@/components/settings/WebhookManager";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function IntegrationsSettingsPage() {
  const { content } = useContent();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function fetchIntegrations() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // For now, using mock data since API keys table doesn't exist yet
        setApiKeys([]);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      // Mock key generation - real implementation requires API endpoint
      const mockKey = `zh_${Math.random()
        .toString(36)
        .substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
      setShowNewKey(mockKey);

      // Add to list with prefix
      const newKey: ApiKey = {
        id: crypto.randomUUID(),
        name: `API Key ${apiKeys.length + 1}`,
        key_prefix: mockKey.substring(0, 10) + "...",
        created_at: new Date().toISOString(),
        last_used_at: null,
      };
      setApiKeys((prev) => [...prev, newKey]);

      toast.success(content.settings.integrations.apiKeys.generatedSuccess);
    } catch (error) {
      console.error("Failed to generate API key:", error);
      toast.error(content.settings.integrations.apiKeys.generateError);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(content.settings.integrations.apiKeys.copySuccess);
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success(content.settings.integrations.apiKeys.revokedSuccess);
    } catch {
      toast.error(content.settings.integrations.apiKeys.revokeError);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* API Keys */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#9382FF]/20 dark:bg-[#9382FF]/30">
              <Key className="w-5 h-5 text-[#9382FF] dark:text-[#9382FF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {content.settings.integrations.apiKeys.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {content.settings.integrations.apiKeys.description}
              </p>
            </div>
          </div>
          <Button
            onClick={generateApiKey}
            disabled={isGenerating}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {content.settings.integrations.apiKeys.generateButton}
          </Button>
        </div>

        {/* New Key Display */}
        {showNewKey && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
              {content.settings.integrations.apiKeys.newKeyLabel}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded font-mono text-sm">
                {showNewKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(showNewKey)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowNewKey(null)}
            >
              {content.settings.integrations.apiKeys.dismissButton}
            </Button>
          </div>
        )}

        {/* Keys List */}
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <Key className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">
              {content.settings.integrations.apiKeys.emptyState}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {content.settings.integrations.apiKeys.emptyStateDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {key.name}
                  </p>
                  <p className="text-sm text-gray-500 font-mono">
                    {key.key_prefix}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {content.settings.integrations.apiKeys.createdLabel}{" "}
                    {new Date(key.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => revokeApiKey(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Webhooks - Full Management UI */}
      <WebhookManager />

      {/* Connected Services */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Plug className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {content.settings.integrations.connectedServices.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {content.settings.integrations.connectedServices.description}
            </p>
          </div>
        </div>

        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Plug className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">
            {content.settings.integrations.connectedServices.emptyState}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {content.settings.integrations.connectedServices.comingSoon}
          </p>
        </div>
      </Card>
    </div>
  );
}
