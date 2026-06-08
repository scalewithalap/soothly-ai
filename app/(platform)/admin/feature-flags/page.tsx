"use client";

/**
 * Feature Flags Admin Page
 *
 * Manage feature flags with toggles, rollout percentages, and tier restrictions.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Flag,
  Plus,
  Trash2,
  X,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { toast } from "sonner";

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  allowed_tiers: string[];
  created_at: string;
  updated_at: string;
}

const AVAILABLE_TIERS = ["free", "starter", "growth", "scale", "enterprise"];

export default function FeatureFlagsPage() {
  const { content } = useContent();
  const admin = content.admin;
  const t = admin.featureFlagsPage || {};

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [rolloutPercentage, setRolloutPercentage] = useState(0);
  const [allowedTiers, setAllowedTiers] = useState<string[]>([]);

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      const res = await fetch("/api/admin/feature-flags");
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags);
      }
    } catch (error) {
      console.error("Failed to fetch flags:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setEnabled(false);
    setRolloutPercentage(0);
    setAllowedTiers([]);
    setEditingId(null);
    setShowForm(false);
  };

  const saveFlag = async () => {
    if (!name) {
      toast.error(t.toasts?.nameRequired || "Flag name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.toLowerCase().replace(/\s+/g, "_"),
        description: description || undefined,
        enabled,
        rollout_percentage: rolloutPercentage,
        allowed_tiers: allowedTiers,
        ...(editingId && { id: editingId }),
      };

      const res = await fetch("/api/admin/feature-flags", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingId
            ? t.toasts?.updated || "Flag updated"
            : t.toasts?.created || "Flag created",
        );
        resetForm();
        fetchFlags();
      } else {
        const data = await res.json();
        toast.error(
          data.error || t.toasts?.saveFailed || "Failed to save flag",
        );
      }
    } catch {
      toast.error(t.toasts?.saveFailed || "Failed to save flag");
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flag.id, enabled: !flag.enabled }),
      });

      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) =>
            f.id === flag.id ? { ...f, enabled: !f.enabled } : f,
          ),
        );
        toast.success(
          flag.enabled
            ? t.toasts?.disabled || "Flag disabled"
            : t.toasts?.enabled || "Flag enabled",
        );
      }
    } catch {
      toast.error(t.toasts?.toggleFailed || "Failed to toggle flag");
    }
  };

  const deleteFlag = async (id: string) => {
    if (!confirm(t.deleteConfirm || "Delete this feature flag?")) return;

    try {
      const res = await fetch(`/api/admin/feature-flags?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== id));
        toast.success(t.toasts?.deleted || "Flag deleted");
      }
    } catch {
      toast.error(t.toasts?.deleteFailed || "Failed to delete flag");
    }
  };

  const editFlag = (flag: FeatureFlag) => {
    setName(flag.name);
    setDescription(flag.description || "");
    setEnabled(flag.enabled);
    setRolloutPercentage(flag.rollout_percentage);
    setAllowedTiers(flag.allowed_tiers);
    setEditingId(flag.id);
    setShowForm(true);
  };

  const toggleTier = (tier: string) => {
    setAllowedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

  const labels = t.labels || {};
  const placeholders = t.placeholders || {};
  const hints = t.hints || {};
  const status = t.status || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-6 h-6" />
            {t.title || "Feature Flags"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.description || "Control feature rollouts and access"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchFlags} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showForm ? t.cancelButton || "Cancel" : t.newButton || "New Flag"}
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId
              ? t.editFormTitle || "Edit Flag"
              : t.createFormTitle || "Create Feature Flag"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">{labels.name || "Flag Name"}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholders.name || "new_feature_enabled"}
                className="mt-1 font-mono"
                disabled={!!editingId}
              />
              <p className="text-xs text-gray-500 mt-1">
                {hints.nameFormat || "Lowercase with underscores"}
              </p>
            </div>
            <div>
              <Label htmlFor="description">
                {labels.description || "Description"}
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  placeholders.description || "Enable new feature for users"
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>
                {labels.rollout || "Rollout Percentage"}: {rolloutPercentage}%
              </Label>
              <input
                type="range"
                min="0"
                max="100"
                value={rolloutPercentage}
                onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                {labels.enabled || "Enabled"}
              </Label>
            </div>
            <div className="md:col-span-2">
              <Label>{labels.allowedTiers || "Allowed Tiers"}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      allowedTiers.includes(tier)
                        ? "bg-[#9382FF]/20 text-[#9382FF] border-[#9382FF]/30"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } border`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {hints.emptyTiers || "Empty = available to all tiers"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={saveFlag} disabled={saving}>
              {saving
                ? t.savingButton || "Saving..."
                : editingId
                  ? t.updateButton || "Update Flag"
                  : t.saveButton || "Create Flag"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              {t.cancelButton || "Cancel"}
            </Button>
          </div>
        </Card>
      )}

      {/* Flags List */}
      <div className="space-y-3">
        {flags.length === 0 ? (
          <Card className="p-8 text-center">
            <Flag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              {t.emptyState || "No feature flags configured"}
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              {t.emptyStateAction || "Create Your First Flag"}
            </Button>
          </Card>
        ) : (
          flags.map((flag) => (
            <Card key={flag.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleFlag(flag)}
                      className="text-[#9382FF] hover:text-[#7B6AF0]"
                    >
                      {flag.enabled ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                    <div>
                      <h3 className="font-mono font-medium text-gray-900 dark:text-white">
                        {flag.name}
                      </h3>
                      {flag.description && (
                        <p className="text-sm text-gray-500">
                          {flag.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 ml-11">
                    <Badge
                      variant={flag.enabled ? "success" : "default"}
                      size="sm"
                    >
                      {flag.enabled
                        ? status.active || "Active"
                        : status.inactive || "Inactive"}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {flag.rollout_percentage}% {t.rolloutLabel || "rollout"}
                    </Badge>
                    {flag.allowed_tiers.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {t.tiersLabel || "Tiers"}:{" "}
                        {flag.allowed_tiers.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editFlag(flag)}
                  >
                    {t.editButton || "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteFlag(flag.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
