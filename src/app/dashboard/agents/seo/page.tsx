"use client";

import { useState, useEffect } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import { DraftQueue } from "@/components/agents/seo/DraftQueue";
import { SeoRichTextEditor } from "@/components/editor/SeoRichTextEditor";
import { SeoHealthHub } from "@/components/agents/seo/SeoHealthHub";
import { toast } from "sonner";

interface Draft {
  id: string;
  title: string;
  keyword: string;
  status: "brief" | "drafting" | "review" | "published";
  updatedAt: string;
  content?: string;
}

interface BriefFromAPI {
  id: string;
  title: string;
  primary_keyword: string;
  status: string;
  updated_at: string;
  articles?: Array<{ content?: string; status?: string }>;
}

function mapBriefToDraft(brief: BriefFromAPI): Draft {
  // Map API status to UI status
  const statusMap: Record<string, Draft["status"]> = {
    draft: "brief",
    in_progress: "drafting",
    researching: "drafting",
    completed: "review",
    published: "published",
  };

  return {
    id: brief.id,
    title: brief.title,
    keyword: brief.primary_keyword,
    status: statusMap[brief.status] || "brief",
    updatedAt: formatRelativeTime(brief.updated_at),
    content: brief.articles?.[0]?.content,
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

export default function SeoAgentPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch drafts from API
  useEffect(() => {
    async function fetchDrafts() {
      try {
        const response = await fetch("/api/agents/content/briefs");
        if (!response.ok) {
          throw new Error("Failed to fetch briefs");
        }
        const data = await response.json();
        const mappedDrafts = (data.data?.briefs || []).map(mapBriefToDraft);
        setDrafts(mappedDrafts);

        // Set first draft as active if none selected
        if (mappedDrafts.length > 0 && !activeDraftId) {
          setActiveDraftId(mappedDrafts[0].id);
        }
      } catch (error) {
        console.error("Error fetching drafts:", error);
        toast.error("Failed to load content briefs");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDrafts();
  }, [activeDraftId]);

  const activeDraft = drafts.find((d) => d.id === activeDraftId);

  const handleNewBrief = () => {
    // TODO: Open new brief modal
    toast.info("New brief creation coming soon");
  };

  return (
    <AgentWorkspace
      queue={
        <DraftQueue
          drafts={drafts}
          activeDraftId={activeDraftId || undefined}
          onSelectDraft={setActiveDraftId}
          onNewBrief={handleNewBrief}
          isLoading={isLoading}
        />
      }
      execution={
        <SeoRichTextEditor
          initialContent={
            activeDraft?.content || `# ${activeDraft?.title || "New Article"}`
          }
        />
      }
      insight={
        <SeoHealthHub
          seoScore={activeDraft?.status === "review" ? 78 : 45}
          keyword={activeDraft?.keyword || ""}
          wordCount={activeDraft?.content?.split(/\s+/).length || 0}
          targetWordCount={1500}
          readabilityScore={8}
        />
      }
    />
  );
}
