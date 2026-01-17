"use client";

/**
 * MCP Server Settings Page
 *
 * Manage MCP server connections - add, edit, test, and delete servers.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Server,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
  X,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useContent } from "@/lib/content";
import { toast } from "sonner";

interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: "stdio" | "sse" | "websocket";
  auth_type: "none" | "api_key" | "bearer" | "basic" | null;
  enabled: boolean;
  health_status: "healthy" | "degraded" | "unhealthy" | "unknown";
  last_health_check: string | null;
  created_at: string;
}

export default function MCPSettingsPage() {
  const { dict } = useContent();
  const t = dict.settings.mcp;

  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingServer, setTestingServer] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transport, setTransport] = useState<MCPServer["transport"]>("sse");
  const [authType, setAuthType] = useState<MCPServer["auth_type"]>("none");
  const [credentials, setCredentials] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/settings/mcp");
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers);
      }
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setTransport("sse");
    setAuthType("none");
    setCredentials("");
    setEditingId(null);
    setShowForm(false);
  };

  const saveServer = async () => {
    if (!name || !url) {
      toast.error(t.toasts.validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        url,
        transport,
        auth_type: authType,
        credentials: authType !== "none" ? credentials : null,
        ...(editingId && { id: editingId }),
      };

      const res = await fetch("/api/settings/mcp", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(t.toasts.saveSuccess);
        resetForm();
        fetchServers();
      } else {
        toast.error(t.toasts.saveError);
      }
    } catch {
      toast.error(t.toasts.saveError);
    } finally {
      setSaving(false);
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm(t.deleteConfirm || "Delete this MCP server?")) return;

    try {
      const res = await fetch(`/api/settings/mcp?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setServers((prev) => prev.filter((s) => s.id !== id));
        toast.success(t.toasts.deleteSuccess);
      }
    } catch {
      toast.error(t.toasts.deleteError);
    }
  };

  const testConnection = async (server?: MCPServer) => {
    const testId = server?.id || "new";
    setTestingServer(testId);

    try {
      const payload = server
        ? { id: server.id }
        : { url, transport, auth_type: authType, credentials };

      const res = await fetch("/api/settings/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.result?.status === "healthy") {
        toast.success(t.toasts.testSuccess);
        if (server) fetchServers();
      } else if (data.result?.status === "degraded") {
        toast.warning(t.health?.degraded || "Connection degraded");
        if (server) fetchServers();
      } else {
        toast.error(t.toasts.testError);
      }
    } catch {
      toast.error(t.toasts.testError);
    } finally {
      setTestingServer(null);
    }
  };

  const editServer = (server: MCPServer) => {
    setName(server.name);
    setUrl(server.url);
    setTransport(server.transport);
    setAuthType(server.auth_type);
    setCredentials("");
    setEditingId(server.id);
    setShowForm(true);
  };

  const getHealthBadge = (status: MCPServer["health_status"]) => {
    switch (status) {
      case "healthy":
        return (
          <Badge variant="success" className="gap-1">
            <Wifi className="w-3 h-3" /> {t.health?.healthy || "Healthy"}
          </Badge>
        );
      case "degraded":
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="w-3 h-3" />{" "}
            {t.health?.degraded || "Degraded"}
          </Badge>
        );
      case "unhealthy":
        return (
          <Badge variant="error" className="gap-1">
            <WifiOff className="w-3 h-3" /> {t.health?.unhealthy || "Unhealthy"}
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="gap-1">
            {t.health?.unknown || "Unknown"}
          </Badge>
        );
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Server className="w-6 h-6" />
            {t.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchServers} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showForm ? t.cancelButton : t.addButton}
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId
              ? t.editTitle || "Edit Server"
              : t.addTitle || "Add MCP Server"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">{t.nameLabel}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="url">{t.urlLabel}</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.urlPlaceholder}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="transport">
                {t.transportLabel || "Transport"}
              </Label>
              <select
                id="transport"
                value={transport}
                onChange={(e) =>
                  setTransport(e.target.value as MCPServer["transport"])
                }
                className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="sse">
                  {t.transportSSE || "SSE (Server-Sent Events)"}
                </option>
                <option value="websocket">
                  {t.transportWebSocket || "WebSocket"}
                </option>
                <option value="stdio">
                  {t.transportStdio || "Stdio (Local)"}
                </option>
              </select>
            </div>
            <div>
              <Label htmlFor="authType">
                {t.authLabel || "Authentication"}
              </Label>
              <select
                id="authType"
                value={authType || "none"}
                onChange={(e) =>
                  setAuthType(e.target.value as MCPServer["auth_type"])
                }
                className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="none">{t.authNone || "None"}</option>
                <option value="api_key">{t.authApiKey || "API Key"}</option>
                <option value="bearer">{t.authBearer || "Bearer Token"}</option>
                <option value="basic">{t.authBasic || "Basic Auth"}</option>
              </select>
            </div>
            {authType && authType !== "none" && (
              <div className="md:col-span-2">
                <Label htmlFor="credentials">
                  {t.credentialsLabel || "Credentials"}
                </Label>
                <Input
                  id="credentials"
                  type="password"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  placeholder={
                    editingId
                      ? t.credentialsPlaceholderEdit ||
                        "Leave empty to keep existing"
                      : t.credentialsPlaceholder || "Enter credentials"
                  }
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={saveServer} disabled={saving}>
              {saving
                ? dict.loadingStates.saving
                : editingId
                  ? t.updateButton || "Update"
                  : t.addButton}
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnection()}
              disabled={!url || testingServer === "new"}
            >
              {testingServer === "new" ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {t.testButton}
            </Button>
          </div>
        </Card>
      )}

      {/* Server List */}
      <div className="space-y-3">
        {servers.length === 0 ? (
          <Card className="p-8 text-center">
            <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{t.emptyState}</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              {t.addFirstButton || "Add Your First Server"}
            </Button>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {server.name}
                    </h3>
                    {getHealthBadge(server.health_status)}
                    <Badge variant="info" size="sm">
                      {server.transport.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 font-mono">
                    {server.url}
                  </p>
                  {server.last_health_check && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t.lastChecked || "Last checked"}:{" "}
                      {new Date(server.last_health_check).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testConnection(server)}
                    disabled={testingServer === server.id}
                  >
                    {testingServer === server.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editServer(server)}
                  >
                    {t.editButton}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteServer(server.id)}
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
