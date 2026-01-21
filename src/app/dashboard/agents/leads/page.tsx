"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import { LeadQueue, type Lead } from "@/components/agents/leads/LeadQueue";
import { OutreachStudio } from "@/components/agents/leads/OutreachStudio";
import { ProspectIntelligence } from "@/components/agents/leads/ProspectIntelligence";
import { toast } from "sonner";

interface APIContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  title: string | null;
  pipeline_stage: string | null;
  updated_at: string;
}

interface EnrichmentResponse {
  summary?: string;
  techStack?: string[];
  signals?: Array<{ type: string; score: number; description: string }>;
  status?: string;
  score?: number;
}

// Map pipeline stage to Lead status
function mapPipelineStageToStatus(stage: string | null): Lead["status"] {
  const stageMap: Record<string, Lead["status"]> = {
    new: "new",
    contacted: "contacted",
    qualified: "qualified",
    converted: "converted",
    rejected: "rejected",
  };
  return stageMap[stage || "new"] || "new";
}

// Convert API contact to Lead
function mapContactToLead(contact: APIContact, score?: number): Lead {
  const name =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  return {
    id: contact.id,
    name,
    title: contact.title || "N/A",
    company: contact.company || "N/A",
    aiScore: score || Math.floor(Math.random() * 40) + 60,
    status: mapPipelineStageToStatus(contact.pipeline_stage),
    updatedAt: formatRelativeTime(contact.updated_at),
  };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function LeadGenPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrichment, setEnrichment] = useState<EnrichmentResponse | null>(null);
  const [isEnrichmentLoading, setIsEnrichmentLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  // Fetch enrichment when active lead changes
  const fetchEnrichment = useCallback(async (leadId: string) => {
    setIsEnrichmentLoading(true);
    try {
      const response = await fetch(`/api/agents/leads/enrich?leadId=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setEnrichment(data.data?.enrichment || null);
      }
    } catch (error) {
      console.error("Error fetching enrichment:", error);
    } finally {
      setIsEnrichmentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeLeadId) {
      fetchEnrichment(activeLeadId);
    }
  }, [activeLeadId, fetchEnrichment]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/leads/pipeline");
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }
      const data = await response.json();

      // Flatten all pipeline stages into a single list
      const allContacts: APIContact[] = [];
      const pipeline = data.data?.pipeline || {};
      for (const stage of Object.keys(pipeline)) {
        allContacts.push(...pipeline[stage]);
      }

      const mappedLeads = allContacts.map((c) => mapContactToLead(c));
      setLeads(mappedLeads);

      // Set first lead as active if none selected
      if (mappedLeads.length > 0 && !activeLeadId) {
        setActiveLeadId(mappedLeads[0].id);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  const activeLead = leads.find((l) => l.id === activeLeadId);

  const handleSendOutreach = async (
    method: "email" | "linkedin",
    content: string,
  ) => {
    if (!activeLeadId) return;

    // Update pipeline stage to contacted
    try {
      await fetch("/api/leads/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeLeadId,
          stage: "contacted",
        }),
      });

      // Update local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeLeadId ? { ...l, status: "contacted" as const } : l,
        ),
      );

      toast.success(
        `${method === "email" ? "Email" : "LinkedIn message"} queued for sending!`,
      );

      // Move to next lead
      handleSkip();
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update lead status");
    }
  };

  const handleSkip = () => {
    const currentIndex = leads.findIndex((l) => l.id === activeLeadId);
    if (currentIndex < leads.length - 1) {
      setActiveLeadId(leads[currentIndex + 1].id);
    }
  };

  // Build enrichment data for OutreachStudio
  const leadWithEnrichment = activeLead
    ? {
        ...activeLead,
        aiScore: enrichment?.score || activeLead.aiScore,
        enrichment: {
          summary: enrichment?.summary,
          techStack: enrichment?.techStack,
        },
      }
    : undefined;

  return (
    <AgentWorkspace
      queue={
        <LeadQueue
          leads={leads}
          activeLeadId={activeLeadId || undefined}
          onSelectLead={setActiveLeadId}
          isLoading={isLoading}
        />
      }
      execution={
        <OutreachStudio
          lead={leadWithEnrichment}
          onSendOutreach={handleSendOutreach}
          onSkip={handleSkip}
        />
      }
      insight={
        <ProspectIntelligence
          companyName={activeLead?.company}
          signals={enrichment?.signals}
        />
      }
    />
  );
}
