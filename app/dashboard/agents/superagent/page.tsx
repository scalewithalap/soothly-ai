"use client";

import { useState, useEffect } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import {
  CampaignHub,
  type Campaign,
} from "@/components/agents/superagent/CampaignHub";
import {
  CampaignCanvas,
  type CampaignStep,
} from "@/components/agents/superagent/CampaignCanvas";
import { StrategyConsole } from "@/components/agents/superagent/StrategyConsole";
import { toast } from "sonner";

export default function SuperagentPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [steps, setSteps] = useState<CampaignStep[]>([]);
  const [campaignStatus, setCampaignStatus] =
    useState<Campaign["status"]>("planning");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch details when activeId changes
  useEffect(() => {
    if (activeId) {
      fetchDetails(activeId);
    } else {
      setSteps([]);
      setCampaignStatus("planning");
    }
  }, [activeId]);

  async function fetchCampaigns() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents/superagent/campaigns");
      if (!response.ok) throw new Error("Failed to fetch campaigns");

      const data = await response.json();
      const mapped = data.data?.campaigns || [];
      setCampaigns(mapped);

      if (mapped.length > 0 && !activeId) {
        setActiveId(mapped[0].id);
      }
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchDetails(id: string) {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/agents/superagent/campaigns/${id}`);
      if (!response.ok) throw new Error("Failed to fetch details");

      const data = await response.json();
      setSteps(data.data?.steps || []);
      setCampaignStatus(data.data?.campaign?.status || "planning");
    } catch {
      console.error("Error fetching campaign details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRun = async () => {
    if (!activeId) return;
    try {
      const response = await fetch(
        `/api/agents/superagent/campaigns/${activeId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "execute" }),
        },
      );
      if (!response.ok) throw new Error("Failed to execute");
      toast.success("Campaign execution started");
      setCampaignStatus("executing");
      setTimeout(() => fetchDetails(activeId), 2000);
    } catch {
      toast.error("Failed to execute campaign");
    }
  };

  const handlePause = () => {
    toast.info("Pause functionality not yet implemented");
  };

  const handleCancel = async () => {
    if (!activeId) return;
    try {
      const response = await fetch(
        `/api/agents/superagent/campaigns/${activeId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        },
      );
      if (!response.ok) throw new Error("Failed to cancel");
      toast.warning("Campaign cancelled");
      setCampaignStatus("cancelled");
    } catch {
      toast.error("Failed to cancel campaign");
    }
  };

  const handleNewCampaign = () => {
    toast.info(
      "Use the Strategy Console on the right to create a new campaign",
    );
  };

  return (
    <AgentWorkspace
      queue={
        <CampaignHub
          campaigns={campaigns}
          activeId={activeId || undefined}
          onSelect={setActiveId}
          onNew={handleNewCampaign}
          isLoading={isLoading}
        />
      }
      execution={
        <CampaignCanvas
          campaignId={activeId || undefined}
          steps={steps}
          status={campaignStatus}
          onRun={handleRun}
          onPause={handlePause}
          onCancel={handleCancel}
        />
      }
      insight={<StrategyConsole onPlanCreated={fetchCampaigns} />}
    />
  );
}
