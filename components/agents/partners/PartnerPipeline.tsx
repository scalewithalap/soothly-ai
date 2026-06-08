"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Image from "next/image";

/**
 * PartnerPipeline - Left Pane for Partnership Agent
 * Displays list of partners grouped by relationship stage.
 */

export interface Partner {
  id: string;
  name: string;
  type: string;
  status:
    | "prospect"
    | "qualified"
    | "contacted"
    | "negotiating"
    | "signed"
    | "rejected";
  fitScore: number;
  logoUrl?: string;
  updatedAt: string;
}

interface PartnerPipelineProps {
  partners: Partner[];
  activePartnerId?: string;
  onSelectPartner: (id: string) => void;
  isLoading?: boolean;
}

const STATUS_FILTERS = [
  "all",
  "prospect",
  "qualified",
  "contacted",
  "negotiating",
  "signed",
] as const;

export function PartnerPipeline({
  partners,
  activePartnerId,
  onSelectPartner,
  isLoading,
}: PartnerPipelineProps) {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filteredPartners = partners.filter((p) =>
    filter === "all" ? true : p.status === filter,
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">
            Partner Pipeline
          </h2>
          <Badge
            variant="outline"
            className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px]"
          >
            {filteredPartners.length} Records
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            className="pl-9 bg-black/20 border-white/10 focus:border-blue-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] uppercase font-medium tracking-wider whitespace-nowrap transition-colors",
                filter === status
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent",
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {/* Skeletons */}
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
          filteredPartners.map((partner) => {
            const isActive = activePartnerId === partner.id;
            return (
              <button
                key={partner.id}
                onClick={() => onSelectPartner(partner.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                  isActive && "bg-white/10 border-l-2 border-l-blue-500",
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Logo Placeholder */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded flex items-center justify-center text-xs font-bold shrink-0",
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-gray-400",
                    )}
                  >
                    {partner.logoUrl ? (
                      <Image
                        src={partner.logoUrl}
                        className="w-full h-full object-cover rounded"
                        alt={partner.name}
                      />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "font-medium text-sm truncate pr-2",
                          isActive ? "text-white" : "text-gray-300",
                        )}
                      >
                        {partner.name}
                      </span>
                      <FitScoreBadge score={partner.fitScore} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Handshake className="w-3 h-3" />
                        <span className="truncate">{partner.type}</span>
                      </div>
                      <StatusBadge status={partner.status} />
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

function StatusBadge({ status }: { status: Partner["status"] }) {
  const styles = {
    prospect: "text-gray-400 bg-gray-500/10 border-gray-500/20",
    qualified: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    contacted: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    negotiating: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    signed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <span
      className={cn(
        "text-[9px] px-1.5 py-0.5 rounded border capitalize",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function FitScoreBadge({ score }: { score: number }) {
  let colorClass = "text-gray-400";
  if (score >= 80) colorClass = "text-emerald-400";
  else if (score >= 60) colorClass = "text-amber-400";

  return <span className={cn("font-mono text-xs", colorClass)}>{score}%</span>;
}
