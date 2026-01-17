"use client";

import { useEffect, useState, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Key,
  Webhook,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { LanguageContext } from "@/context/language-context";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: { read: boolean; write: boolean };
  rateLimit: number;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
}

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export default function AdminSettingsPage() {
  const ctx = useContext(LanguageContext);
  const tApiKeys = (ctx?.content?.apiKeys || {}) as Record<string, string>;
  const tWebhooks = (ctx?.content?.webhooks || {}) as Record<string, string>;

  const [activeTab, setActiveTab] = useState<"api-keys" | "webhooks">(
    "api-keys",
  );

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  const fetchApiKeys = async () => {
    setKeysLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setKeysLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks);
        setAvailableEvents(data.availableEvents);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    } finally {
      setWebhooksLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!keyName) {
      toast.error("Name is required");
      return;
    }

    setCreatingKey(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setKeyName("");
        fetchApiKeys();
        toast.success("API key created");
      } else {
        toast.error("Failed to create API key");
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
        toast.success("API key revoked");
      }
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const createWebhook = async () => {
    if (!webhookName || !webhookUrl || webhookEvents.length === 0) {
      toast.error("Name, URL, and at least one event are required");
      return;
    }

    setCreatingWebhook(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: webhookName,
          url: webhookUrl,
          events: webhookEvents,
        }),
      });

      if (res.ok) {
        toast.success("Webhook created");
        setShowWebhookForm(false);
        setWebhookName("");
        setWebhookUrl("");
        setWebhookEvents([]);
        fetchWebhooks();
      } else {
        toast.error("Failed to create webhook");
      }
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setCreatingWebhook(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        toast.success("Webhook deleted");
      }
    } catch {
      toast.error("Failed to delete webhook");
    }
  };

  const toggleEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage API keys and webhooks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("api-keys")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "api-keys"
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Key className="w-4 h-4 inline mr-2" />
          {tApiKeys.title || "API Keys"}
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "webhooks"
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Webhook className="w-4 h-4 inline mr-2" />
          {tWebhooks.title || "Webhooks"}
        </button>
      </div>

      {/* API Keys Tab */}
      {activeTab === "api-keys" && (
        <div className="space-y-4">
          {newKey && (
            <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2 font-medium">
                {tApiKeys.copyWarning ||
                  "Copy this key now. You won't be able to see it again."}
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded text-sm font-mono overflow-x-auto">
                  {newKey}
                </code>
                <Button size="sm" onClick={() => copyToClipboard(newKey)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewKey(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={fetchApiKeys}
              disabled={keysLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${keysLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button onClick={() => setShowKeyForm(!showKeyForm)}>
              {showKeyForm ? (
                <X className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {showKeyForm ? "Cancel" : tApiKeys.create || "Create API Key"}
            </Button>
          </div>

          {showKeyForm && (
            <Card className="p-4">
              <div className="flex gap-2">
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder={tApiKeys.namePlaceholder || "My Integration"}
                  className="flex-1"
                />
                <Button onClick={createApiKey} disabled={creatingKey}>
                  {creatingKey ? "Creating..." : "Create"}
                </Button>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-4 py-3 font-medium">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">
                      {key.keyPrefix}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {key.usageCount} requests
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeApiKey(key.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {apiKeys.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No API keys created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={fetchWebhooks}
              disabled={webhooksLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${webhooksLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button onClick={() => setShowWebhookForm(!showWebhookForm)}>
              {showWebhookForm ? (
                <X className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {showWebhookForm
                ? "Cancel"
                : tWebhooks.create || "Create Webhook"}
            </Button>
          </div>

          {showWebhookForm && (
            <Card className="p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    placeholder="My Webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder={
                      tWebhooks.urlPlaceholder ||
                      "https://your-server.com/webhook"
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Events</label>
                <div className="flex flex-wrap gap-2">
                  {availableEvents.map((event) => (
                    <button
                      key={event}
                      onClick={() => toggleEvent(event)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        webhookEvents.includes(event)
                          ? "bg-violet-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {webhookEvents.includes(event) && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={createWebhook} disabled={creatingWebhook}>
                {creatingWebhook ? "Creating..." : "Create Webhook"}
              </Button>
            </Card>
          )}

          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Events
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id}>
                    <td className="px-4 py-3 font-medium">{webhook.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {webhook.url}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {webhook.events.length} events
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={webhook.is_active ? "success" : "default"}
                      >
                        {webhook.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteWebhook(webhook.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {webhooks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No webhooks configured yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
