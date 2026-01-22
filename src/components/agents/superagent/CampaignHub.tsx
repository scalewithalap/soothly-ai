"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * CampaignHub - Left Pane for Superagent
 * List of active and past campaigns.
 */

export interface Campaign {
  id: string;
  name: string;
  type: "niche_takeover" | "content_blitz" | "outbound" | "custom";
  status: "planning" | "executing" | "completed" | "cancelled" | "failed";
  progress: string; // e.g. "Step 2/5"
  updatedAt: string;
}

interface CampaignHubProps {
  campaigns: Campaign[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  isLoading?: boolean;
}

export function CampaignHub({
  campaigns,
  activeId,
  onSelect,
  onNew,
  isLoading,
}: CampaignHubProps) {
  const [search, setSearch] = useState("");

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-[#0F0F10] border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" /> Campaigns
          </h2>
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6 border-white/10 hover:bg-white/5"
            onClick={onNew}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded bg-white/10" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-white/10 w-2/3 rounded" />
                  <div className="h-2 bg-white/5 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((campaign) => {
              const isActive = activeId === campaign.id;
              return (
                <button
                  key={campaign.id}
                  onClick={() => onSelect(campaign.id)}
                  className={cn(
                    "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                    isActive && "bg-white/5 border-l-2 border-l-purple-500",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded flex items-center justify-center shrink-0 border text-xs font-bold transition-colors",
                        isActive
                          ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                          : "bg-white/5 border-white/10 text-gray-400",
                      )}
                    >
                      {campaign.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={cn(
                            "font-medium text-sm truncate pr-2",
                            isActive ? "text-white" : "text-gray-300",
                          )}
                        >
                          {campaign.name}
                        </span>
                        {getStatusIcon(campaign.status)}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 h-4 border-white/10 text-gray-500 font-normal capitalize"
                        >
                          {campaign.type.replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] text-gray-600">
                          {campaign.progress}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function getStatusIcon(status: Campaign["status"]) {
  switch (status) {
    case "executing":
      return <Play className="w-3 h-3 text-blue-400 animate-pulse" />;
    case "completed":
      return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    case "failed":
      return <AlertTriangle className="w-3 h-3 text-red-400" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-gray-600" />;
  }
}
