"use client";

import { useState, useEffect } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import {
  ProposalQueue,
  type Prospect,
} from "@/components/agents/proposals/ProposalQueue";
import {
  ProposalEditor,
  type ProposalContent,
} from "@/components/agents/proposals/ProposalEditor";
import {
  SalesIntelligence,
  type AnalysisData,
} from "@/components/agents/proposals/SalesIntelligence";
import { toast } from "sonner";

export default function ProposalPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeAnalysis, setActiveAnalysis] = useState<
    AnalysisData | undefined
  >();
  const [activeProposal, setActiveProposal] = useState<
    ProposalContent | undefined
  >();
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch prospects on mount
  useEffect(() => {
    fetchProspects();
  }, []);

  // Fetch details when activeId changes
  useEffect(() => {
    if (activeId) {
      fetchDetails(activeId);
    } else {
      setActiveAnalysis(undefined);
      setActiveProposal(undefined);
    }
  }, [activeId]);

  async function fetchProspects() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents/proposals");
      if (!response.ok) throw new Error("Failed to fetch prospects");

      const data = await response.json();
      const mapped = data.data?.prospects || [];
      setProspects(mapped);

      // Auto-select first
      if (mapped.length > 0 && !activeId) {
        setActiveId(mapped[0].id);
      }
    } catch (error) {
      console.error("Error fetching prospects:", error);
      toast.error("Failed to load prospects");
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchDetails(id: string) {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/agents/proposals/${id}`);
      if (!response.ok) throw new Error("Failed to fetch details");

      const data = await response.json();
      setActiveAnalysis(data.data?.analysis);
      setActiveProposal(data.data?.proposal?.content);
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const activeProspect = prospects.find((p) => p.id === activeId);

  const handleAnalyze = async (url: string) => {
    try {
      toast.info(`Starting analysis for ${url}...`);
      const response = await fetch("/api/agents/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Failed to start analysis");

      toast.success("Analysis started. AI is scanning the website.");
      // Refresh list shortly
      setTimeout(fetchProspects, 2000);
    } catch {
      toast.error("Failed to start analysis");
    }
  };

  const handleSave = async (content: ProposalContent) => {
    if (!activeId) return;
    try {
      const response = await fetch(`/api/agents/proposals/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error("Failed to save draft");
      toast.success("Proposal draft saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleSend = async () => {
    if (!activeId) return;
    try {
      const response = await fetch(`/api/agents/proposals/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!response.ok) throw new Error("Failed to update status");

      toast.success("Proposal marked as sent!");
      setProspects((prev) =>
        prev.map((p) =>
          p.id === activeId ? { ...p, status: "proposal_sent" as const } : p,
        ),
      );
    } catch {
      toast.error("Failed to send");
    }
  };

  const handleRegenerate = async () => {
    // Triggering regeneration requires AI call - placeholder for now
    toast.info("AI Regeneration requested (Not fully connected in UI demo)");
  };

  return (
    <AgentWorkspace
      queue={
        <ProposalQueue
          prospects={prospects}
          activeId={activeId || undefined}
          onSelect={setActiveId}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
        />
      }
      execution={
        <ProposalEditor
          prospect={activeProspect}
          content={activeProposal}
          status={(activeProspect?.status as any) || "draft"}
          onSave={handleSave}
          onSend={handleSend}
          onRegenerate={handleRegenerate}
        />
      }
      insight={
        <SalesIntelligence
          analysis={activeAnalysis}
          isLoading={isLoadingDetails || activeProspect?.status === "analyzing"}
        />
      }
    />
  );
}
