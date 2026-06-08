"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import {
  CompetitorList,
  type Competitor,
} from "@/components/agents/intel/CompetitorList";
import {
  IntelFeed,
  type ChangeEvent,
} from "@/components/agents/intel/IntelFeed";
import { MarketRadar } from "@/components/agents/intel/MarketRadar";
import { toast } from "sonner";

export default function CompetitorPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [isLoadingChanges, setIsLoadingChanges] = useState(false);

  async function fetchCompetitors() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents/competitors");
      if (!response.ok) throw new Error("Failed to fetch competitors");

      const data = await response.json();
      const mapped = data.data?.competitors || [];
      setCompetitors(mapped);

      // Auto-select first competitor
      if (mapped.length > 0 && !activeId) {
        setActiveId(mapped[0].id);
      }
    } catch (error) {
      console.error("Error fetching competitors:", error);
      toast.error("Failed to load competitors");
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch competitors on mount
  useEffect(() => {
    fetchCompetitors();
  }, []);

  // Fetch changes when active competitor changes
  const fetchChanges = useCallback(async (competitorId: string) => {
    try {
      setIsLoadingChanges(true);
      const response = await fetch(
        `/api/agents/competitors/${competitorId}/changes`,
      );
      if (response.ok) {
        const data = await response.json();
        setChanges(data.data?.changes || []);
      }
    } catch (error) {
      console.error("Error fetching changes:", error);
    } finally {
      setIsLoadingChanges(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) {
      fetchChanges(activeId);
    }
  }, [activeId, fetchChanges]);

  const activeCompetitor = competitors.find((c) => c.id === activeId);

  const handleAddCompetitor = async (url: string) => {
    try {
      const response = await fetch("/api/agents/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Failed to add competitor");

      const data = await response.json();
      toast.success(`Started monitoring ${data.data.competitor.name}`);

      // Add to local state
      setCompetitors((prev) => [
        {
          id: data.data.competitor.id,
          name: data.data.competitor.name,
          url: data.data.competitor.url,
          status: "scanning",
          alertCount: 0,
          lastScannedAt: "Just now",
          logoUrl: `https://logo.clearbit.com/${new URL(url).hostname}`,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Error adding competitor:", error);
      toast.error("Failed to add competitor");
    }
  };

  // Calculate radar data from changes
  const radarData =
    changes.length > 0
      ? {
          pricingAggression:
            changes.filter((c) => c.type === "price_change").length * 2,
          featureVelocity:
            changes.filter(
              (c) => c.type === "feature_added" || c.type === "feature_removed",
            ).length * 2,
          messagingShift:
            changes.filter((c) => c.type === "headline_change").length * 2,
          insight: generateInsight(changes),
        }
      : undefined;

  return (
    <AgentWorkspace
      queue={
        <CompetitorList
          competitors={competitors}
          activeId={activeId || undefined}
          onSelect={setActiveId}
          onAdd={handleAddCompetitor}
          isLoading={isLoading}
        />
      }
      execution={
        <IntelFeed
          competitor={activeCompetitor}
          changes={changes}
          isLoading={isLoadingChanges}
        />
      }
      insight={
        <MarketRadar competitorName={activeCompetitor?.name} data={radarData} />
      }
    />
  );
}

function generateInsight(changes: ChangeEvent[]): string {
  const priceChanges = changes.filter((c) => c.type === "price_change").length;
  const featureChanges = changes.filter(
    (c) => c.type === "feature_added" || c.type === "feature_removed",
  ).length;

  if (priceChanges > featureChanges) {
    return "Competitor is focused on monetization strategy optimization. Consider evaluating your pricing competitiveness.";
  } else if (featureChanges > 2) {
    return "High feature velocity detected. Product-led growth strategy in play. Monitor for potential market positioning shifts.";
  }
  return "Steady-state operations. No significant strategic shifts detected in the monitored period.";
}
