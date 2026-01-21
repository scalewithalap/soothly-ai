"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DraftQueue - Left Pane for SEO Agent
 * Displays list of briefs and drafts.
 */

interface Draft {
  id: string;
  title: string;
  keyword: string;
  status: "brief" | "drafting" | "review" | "published";
  updatedAt: string;
}

interface DraftQueueProps {
  drafts: Draft[];
  activeDraftId?: string;
  onSelectDraft: (id: string) => void;
  onNewBrief: () => void;
  isLoading?: boolean;
}

export function DraftQueue({
  drafts,
  activeDraftId,
  onSelectDraft,
  onNewBrief,
  isLoading,
}: DraftQueueProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">Content Queue</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNewBrief}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            className="pl-9 bg-black/20 border-white/10 focus:border-primary/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          drafts.map((draft) => {
            const isActive = activeDraftId === draft.id;
            return (
              <button
                key={draft.id}
                onClick={() => onSelectDraft(draft.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                  isActive && "bg-white/10 border-l-2 border-l-primary",
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span
                      className={cn(
                        "font-medium text-sm truncate",
                        isActive ? "text-white" : "text-gray-300",
                      )}
                    >
                      {draft.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                    {draft.updatedAt}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span className="truncate">{draft.keyword}</span>
                </div>

                <div className="flex items-center justify-between">
                  <DraftStatusBadge status={draft.status} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function DraftStatusBadge({ status }: { status: Draft["status"] }) {
  const styles = {
    brief: "text-gray-400 border-gray-500/30",
    drafting: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    review: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    published: "text-green-400 border-green-500/30 bg-green-500/10",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 h-4 border-white/10",
        styles[status],
      )}
    >
      {status}
    </Badge>
  );
}
