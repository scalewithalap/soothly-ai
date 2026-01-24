"use client";

/**
 * WebhookManager Component
 *
 * Full-featured webhook management for Zapier/Make integration.
 * Supports create, edit, delete, test, and view delivery history.
 */

import { useState, useEffect, useCallback, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  Play,
  History,
  Copy,
  Check,
  X,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// Types
// ============================================================================

interface WebhookData {
  id: string;
  name: string;
  description: string | null;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
  avgResponseTime: number;
}

interface DeliveryRecord {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  response_status: number | null;
  response_time_ms: number | null;
  created_at: string;
}

// Event categories from the service
const EVENT_CATEGORIES: Record<string, string[]> = {
  "Agent Lifecycle": [
    "agent.task.started",
    "agent.task.completed",
    "agent.task.failed",
    "agent.approval.requested",
    "agent.approval.resolved",
  ],
  "Lead Generation": [
    "lead.campaign.created",
    "lead.campaign.completed",
    "lead.scraped",
    "lead.enriched",
    "lead.scored",
    "lead.enrolled_sequence",
  ],
  "Email Sequences": [
    "sequence.email.sent",
    "sequence.email.opened",
    "sequence.email.clicked",
    "sequence.email.replied",
    "sequence.email.bounced",
    "sequence.enrollment.completed",
  ],
  "Content & SEO": [
    "content.article.generated",
    "content.article.optimized",
    "content.article.published",
  ],
  Partnerships: [
    "partner.discovered",
    "partner.qualified",
    "partner.outreach.sent",
  ],
  Revenue: [
    "payment.failed",
    "payment.recovered",
    "subscription.renewed",
    "subscription.cancelled",
  ],
  "Team & Admin": [
    "team.member.added",
    "team.member.removed",
    "usage.limit.reached",
  ],
};

// ============================================================================
// Component
// ============================================================================

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(
    null,
  );
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<
    Record<string, DeliveryRecord[]>
  >({});
  const [stats, setStats] = useState<Record<string, WebhookStats>>({});
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const fetchWebhookDetails = async (webhookId: string) => {
    try {
      const res = await fetch(`/api/webhooks/${webhookId}`);
      if (res.ok) {
        const data = await res.json();
        setStats((prev) => ({ ...prev, [webhookId]: data.stats }));
      }

      const deliveriesRes = await fetch(
        `/api/webhooks/${webhookId}/deliveries`,
      );
      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        setDeliveries((prev) => ({ ...prev, [webhookId]: data.deliveries }));
      }
    } catch (error) {
      console.error("Failed to fetch webhook details:", error);
    }
  };

  const handleToggleExpand = (webhookId: string) => {
    if (expandedWebhook === webhookId) {
      setExpandedWebhook(null);
    } else {
      setExpandedWebhook(webhookId);
      fetchWebhookDetails(webhookId);
    }
  };

  const handleCreate = async () => {
    if (!formName || !formUrl || formEvents.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          description: formDescription,
          events: formEvents,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewSecret(data.secret);
        toast.success("Webhook created successfully");
        fetchWebhooks();
        resetForm();
        setShowCreateDialog(false);
      } else {
        toast.error("Failed to create webhook");
      }
    } catch (error) {
      toast.error("Failed to create webhook");
    }
  };

  const handleUpdate = async () => {
    if (!editingWebhook) return;

    try {
      const res = await fetch(`/api/webhooks/${editingWebhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          description: formDescription,
          events: formEvents,
        }),
      });

      if (res.ok) {
        toast.success("Webhook updated successfully");
        fetchWebhooks();
        setEditingWebhook(null);
        resetForm();
      } else {
        toast.error("Failed to update webhook");
      }
    } catch (error) {
      toast.error("Failed to update webhook");
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      const res = await fetch(`/api/webhooks/${webhookId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Webhook deleted");
        fetchWebhooks();
      } else {
        toast.error("Failed to delete webhook");
      }
    } catch (error) {
      toast.error("Failed to delete webhook");
    }
  };

  const handleToggleActive = async (webhook: WebhookData) => {
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !webhook.is_active }),
      });

      if (res.ok) {
        toast.success(
          webhook.is_active ? "Webhook disabled" : "Webhook enabled",
        );
        fetchWebhooks();
      }
    } catch (error) {
      toast.error("Failed to update webhook");
    }
  };

  const handleTest = async (webhookId: string) => {
    setTestingWebhook(webhookId);

    try {
      const res = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Test successful! Response: ${data.responseStatus} (${data.responseTime}ms)`,
        );
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    } catch (error) {
      toast.error("Failed to test webhook");
    } finally {
      setTestingWebhook(null);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormUrl("");
    setFormDescription("");
    setFormEvents([]);
  };

  const openEditDialog = (webhook: WebhookData) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormDescription(webhook.description || "");
    setFormEvents(webhook.events);
  };

  const handleEventToggle = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleCategoryToggle = (events: string[]) => {
    const allSelected = events.every((e) => formEvents.includes(e));
    if (allSelected) {
      setFormEvents((prev) => prev.filter((e) => !events.includes(e)));
    } else {
      setFormEvents((prev) => [...new Set([...prev, ...events])]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9382FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Webhook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Webhooks
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Send events to external services like Zapier and Make
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      {/* New Secret Display */}
      {newSecret && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-300">
                Webhook created! Save this secret - it won&apos;t be shown
                again.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded font-mono text-sm">
                  {newSecret}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(newSecret)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewSecret(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Webhook className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No webhooks configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a webhook to send events to Zapier, Make, or any URL
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="overflow-hidden">
              {/* Webhook Row */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={webhook.is_active}
                    onCheckedChange={() => handleToggleActive(webhook)}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {webhook.name}
                      </span>
                      <Badge
                        variant={webhook.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {webhook.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate max-w-md">
                      {webhook.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {webhook.events.length} events
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTest(webhook.id)}
                    disabled={testingWebhook === webhook.id}
                  >
                    {testingWebhook === webhook.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(webhook)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleExpand(webhook.id)}
                  >
                    {expandedWebhook === webhook.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(webhook.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedWebhook === webhook.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  {/* Stats */}
                  {stats[webhook.id] && (
                    <div className="grid grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats[webhook.id].total}
                        </p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-green-600">
                          {stats[webhook.id].success}
                        </p>
                        <p className="text-xs text-gray-500">Success</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-red-600">
                          {stats[webhook.id].failed}
                        </p>
                        <p className="text-xs text-gray-500">Failed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-blue-600">
                          {stats[webhook.id].successRate}%
                        </p>
                        <p className="text-xs text-gray-500">Success Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                          {stats[webhook.id].avgResponseTime}ms
                        </p>
                        <p className="text-xs text-gray-500">Avg Response</p>
                      </div>
                    </div>
                  )}

                  {/* Recent Deliveries */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Recent Deliveries
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchWebhookDetails(webhook.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>

                    {deliveries[webhook.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {deliveries[webhook.id].slice(0, 5).map((delivery) => (
                          <div
                            key={delivery.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded text-sm"
                          >
                            <div className="flex items-center gap-3">
                              {delivery.status === "success" ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : delivery.status === "pending_retry" ? (
                                <RefreshCw className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <X className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-medium">
                                {delivery.event_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-500">
                              {delivery.response_status && (
                                <span>HTTP {delivery.response_status}</span>
                              )}
                              {delivery.response_time_ms && (
                                <span>{delivery.response_time_ms}ms</span>
                              )}
                              <span>
                                {new Date(delivery.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No deliveries yet
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingWebhook}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingWebhook(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? "Edit Webhook" : "Create Webhook"}
            </DialogTitle>
            <DialogDescription>
              Configure a webhook to receive events from Zero Headache
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My Zapier Webhook"
              />
            </div>

            <div>
              <Label>URL *</Label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div>
              <Label>Events *</Label>
              <p className="text-xs text-gray-500 mb-2">
                Select which events trigger this webhook
              </p>
              <ScrollArea className="h-64 border rounded-md p-3">
                {Object.entries(EVENT_CATEGORIES).map(([category, events]) => (
                  <div key={category} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={events.every((e) => formEvents.includes(e))}
                        onCheckedChange={() => handleCategoryToggle(events)}
                      />
                      <span className="font-medium text-sm">{category}</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      {events.map((event) => (
                        <div key={event} className="flex items-center gap-2">
                          <Checkbox
                            checked={formEvents.includes(event)}
                            onCheckedChange={() => handleEventToggle(event)}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {event}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingWebhook(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingWebhook ? handleUpdate : handleCreate}>
              {editingWebhook ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
