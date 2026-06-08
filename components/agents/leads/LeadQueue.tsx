"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * LeadQueue - Left Pane for Lead Gen Agent
 * Displays list of AI-scored leads.
 */

export interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  aiScore: number;
  status: "new" | "contacted" | "qualified" | "converted" | "rejected";
  avatar?: string;
  updatedAt: string;
}

interface LeadQueueProps {
  leads: Lead[];
  activeLeadId?: string;
  onSelectLead: (id: string) => void;
  isLoading?: boolean;
}

export function LeadQueue({
  leads,
  activeLeadId,
  onSelectLead,
  isLoading,
}: LeadQueueProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">Prospect List</h2>
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]"
          >
            {leads.length} Found
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            className="pl-9 bg-black/20 border-white/10 focus:border-primary/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          leads.map((lead) => {
            const isActive = activeLeadId === lead.id;
            return (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                  isActive && "bg-white/10 border-l-2 border-l-primary",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar / Initials */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-gray-400",
                    )}
                  >
                    {lead.avatar ? (
                      <Image
                        src={lead.avatar}
                        alt={lead.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span
                        className={cn(
                          "font-medium text-sm truncate pr-2",
                          isActive ? "text-white" : "text-gray-300",
                        )}
                      >
                        {lead.name}
                      </span>
                      <ScoreBadge score={lead.aiScore} />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Briefcase className="w-3 h-3" />
                      <span className="truncate">{lead.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{lead.company}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass = "text-gray-400 border-gray-500/30";
  if (score >= 80)
    colorClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  else if (score >= 50)
    colorClass = "text-amber-400 border-amber-500/30 bg-amber-500/10";
  else colorClass = "text-red-400 border-red-500/30 bg-red-500/10";

  return (
    <div
      className={cn(
        "text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none flex items-center gap-1",
        colorClass,
      )}
    >
      <span className="opacity-70 text-[8px]">AI</span>
      {score}
    </div>
  );
}
