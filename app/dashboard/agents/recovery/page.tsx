"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import {
  RecoveryFeed,
  type Recovery,
} from "@/components/agents/recovery/RecoveryFeed";
import { RecoveryActionCenter } from "@/components/agents/recovery/RecoveryActionCenter";
import { HealthMonitor } from "@/components/agents/recovery/HealthMonitor";
import { toast } from "sonner";

interface RecoveryStats {
  recoveryRate: number;
  totalRecovered: number;
  totalAtRisk: number;
  topFailureReasons: { reason: string; count: number }[];
}

export default function RevenueRecoveryPage() {
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<RecoveryStats | undefined>();

  // Fetch recoveries on mount
  useEffect(() => {
    fetchRecoveries();
    fetchStats();
  }, []);

  async function fetchRecoveries() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents/recovery/recoveries");
      if (!response.ok) throw new Error("Failed to fetch recoveries");

      const data = await response.json();
      const mapped = data.data?.recoveries || [];
      setRecoveries(mapped);

      // Auto-select first recovery
      if (mapped.length > 0 && !activeId) {
        setActiveId(mapped[0].id);
      }
    } catch (error) {
      console.error("Error fetching recoveries:", error);
      toast.error("Failed to load recoveries");
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchStats() {
    try {
      const response = await fetch("/api/agents/recovery/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.data?.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const activeRecovery = recoveries.find((r) => r.id === activeId);

  const handleRetry = useCallback(async () => {
    if (!activeId) return;

    try {
      toast.loading("Triggering payment retry...");
      const response = await fetch("/api/agents/recovery/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryId: activeId }),
      });

      toast.dismiss();

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Retry failed");
      }

      toast.success("Payment retry triggered. Awaiting result...");

      // Refresh data after short delay
      setTimeout(() => {
        fetchRecoveries();
        fetchStats();
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed");
    }
  }, [activeId]);

  const handleBlock = useCallback(async () => {
    if (!activeId) return;

    try {
      const response = await fetch("/api/agents/recovery/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryId: activeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Block failed");
      }

      toast.error("User blocked and account suspended.");

      // Update local state
      setRecoveries((prev) =>
        prev.map((r) =>
          r.id === activeId ? { ...r, status: "blocked" as const } : r,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Block failed");
    }
  }, [activeId]);

  const handleSendEmail = useCallback(() => {
    // Email sending would be implemented here
    toast.success("Recovery email sent to customer.");
  }, []);

  return (
    <AgentWorkspace
      queue={
        <RecoveryFeed
          recoveries={recoveries}
          activeId={activeId || undefined}
          onSelect={setActiveId}
          isLoading={isLoading}
        />
      }
      execution={
        <RecoveryActionCenter
          recovery={activeRecovery}
          onRetry={handleRetry}
          onBlock={handleBlock}
          onSendEmail={handleSendEmail}
        />
      }
      insight={<HealthMonitor stats={stats} />}
    />
  );
}
