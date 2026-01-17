"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plug, Key, Copy, Webhook, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContent } from "@/hooks/use-content";

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
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
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
  };

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
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* API Keys */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Key className="w-5 h-5 text-violet-600 dark:text-violet-400" />
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

      {/* Webhooks */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Webhook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {content.settings.integrations.webhooks.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {content.settings.integrations.webhooks.description}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {content.settings.integrations.webhooks.urlLabel}
            </label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={content.settings.integrations.webhooks.placeholder}
                className="flex-1"
              />
              <Button variant="outline" disabled>
                {content.settings.integrations.webhooks.saveButton}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {content.settings.integrations.webhooks.helperText}
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {content.settings.integrations.webhooks.eventsTitle}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  lead.scraped
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  lead.enriched
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  article.generated
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  partner.discovered
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
