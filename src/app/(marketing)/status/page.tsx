"use client";

/**
 * Public Status Page
 *
 * Displays real-time system health status.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Cpu,
} from "lucide-react";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: "up" | "down" | "degraded";
  latency?: number;
  message?: string;
}

const STATUS_CONFIG = {
  healthy: {
    color: "success",
    icon: CheckCircle,
    label: "All Systems Operational",
  },
  degraded: { color: "warning", icon: AlertTriangle, label: "Partial Outage" },
  unhealthy: { color: "error", icon: XCircle, label: "Major Outage" },
} as const;

const COMPONENT_CONFIG = {
  database: { icon: Database, label: "Database" },
  redis: { icon: Server, label: "Cache (Redis)" },
  memory: { icon: Cpu, label: "Application" },
} as const;

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
      setLastUpdated(new Date());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: "up" | "down" | "degraded") => {
    switch (status) {
      case "up":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: "up" | "down" | "degraded") => {
    const variants = {
      up: "success",
      degraded: "warning",
      down: "error",
    } as const;
    return variants[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const overallStatus = health?.status || "unhealthy";
  const config = STATUS_CONFIG[overallStatus];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="w-8 h-8 text-violet-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Zero Headache Status
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system health monitoring
          </p>
        </div>

        {/* Overall Status */}
        <Card
          className={`p-6 mb-6 ${
            overallStatus === "healthy"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : overallStatus === "degraded"
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon
                className={`w-8 h-8 ${
                  overallStatus === "healthy"
                    ? "text-green-600"
                    : overallStatus === "degraded"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              />
              <span
                className={`text-lg font-semibold ${
                  overallStatus === "healthy"
                    ? "text-green-900 dark:text-green-100"
                    : overallStatus === "degraded"
                      ? "text-amber-900 dark:text-amber-100"
                      : "text-red-900 dark:text-red-100"
                }`}
              >
                {config.label}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStatus}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Components */}
        <Card className="divide-y divide-gray-200 dark:divide-gray-700">
          {health?.checks &&
            Object.entries(health.checks).map(([key, check]) => {
              const compConfig =
                COMPONENT_CONFIG[key as keyof typeof COMPONENT_CONFIG];
              const CompIcon = compConfig?.icon || Server;

              return (
                <div
                  key={key}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CompIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {compConfig?.label || key}
                      </p>
                      {check.latency !== undefined && (
                        <p className="text-xs text-gray-500">
                          {check.latency}ms latency
                        </p>
                      )}
                      {check.message && (
                        <p className="text-xs text-gray-500">{check.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <Badge variant={getStatusBadge(check.status)} size="sm">
                      {check.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          {lastUpdated && (
            <p>
              Last updated: {lastUpdated.toLocaleTimeString()} •{" "}
              <button
                onClick={fetchStatus}
                className="text-violet-600 hover:underline"
              >
                Refresh
              </button>
            </p>
          )}
          {health?.version && <p className="mt-1">Version: {health.version}</p>}
        </div>
      </div>
    </div>
  );
}
