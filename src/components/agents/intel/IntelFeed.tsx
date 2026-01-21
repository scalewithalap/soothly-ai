"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Type,
  Layout,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Competitor } from "./CompetitorList";

/**
 * IntelFeed - Center Pane for Intel Agent
 * Stream of detected changes with diff visualization.
 */

export interface ChangeEvent {
  id: string;
  type:
    | "price_change"
    | "feature_added"
    | "feature_removed"
    | "headline_change"
    | "content_update";
  priority: "critical" | "high" | "medium" | "low";
  summary: string;
  implication: string;
  detectedAt: string;
  url: string;
  diff?: {
    before: string;
    after: string;
  };
}

interface IntelFeedProps {
  competitor?: Competitor;
  changes: ChangeEvent[];
  isLoading?: boolean;
}

export function IntelFeed({ competitor, changes, isLoading }: IntelFeedProps) {
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);

  if (!competitor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
        <Layout className="w-12 h-12 opacity-20" />
        <p>Select a competitor to view intelligence feed</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0F0F10]">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
              {competitor.name}
              <a
                href={competitor.url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last scanned {competitor.lastScannedAt}
              </span>
              <span>•</span>
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-medium tracking-wider",
                  competitor.status === "scanning"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-white/5 text-gray-400",
                )}
              >
                {competitor.status}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 hover:bg-white/5"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share Report
            </Button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">
            Loading intelligence feed...
          </div>
        ) : changes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No recent changes detected.
          </div>
        ) : (
          changes.map((change) => (
            <ChangeCard
              key={change.id}
              change={change}
              isExpanded={selectedChangeId === change.id}
              onToggle={() =>
                setSelectedChangeId(
                  selectedChangeId === change.id ? null : change.id,
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChangeCard({
  change,
  isExpanded,
  onToggle,
}: {
  change: ChangeEvent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getIcon = () => {
    switch (change.type) {
      case "price_change":
        return <TrendingUp className="w-4 h-4" />;
      case "headline_change":
        return <Type className="w-4 h-4" />;
      default:
        return <AlertOctagon className="w-4 h-4" />;
    }
  };

  const getPriorityColor = () => {
    switch (change.priority) {
      case "critical":
        return "border-red-500/50 bg-red-500/5 text-red-400";
      case "high":
        return "border-orange-500/50 bg-orange-500/5 text-orange-400";
      default:
        return "border-blue-500/30 bg-blue-500/5 text-blue-400";
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-current/5 transition-all",
        isExpanded
          ? "border-white/20 bg-white/5"
          : "border-white/5 hover:border-white/10",
      )}
    >
      {/* Summary Header */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                getPriorityColor(),
              )}
            >
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white">{change.summary}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] uppercase h-5",
                    getPriorityColor(),
                  )}
                >
                  {change.type.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {change.implication}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
            {change.detectedAt}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && change.diff && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-black/30 rounded border border-white/5 p-4 space-y-4">
            <div>
              <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> Strategic Implication
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {change.implication}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-red-950/20 p-3 rounded border border-red-500/10">
                <div className="text-[10px] text-red-400 mb-2 uppercase font-medium">
                  Previous Content
                </div>
                <code className="text-xs text-red-200/70 font-mono whitespace-pre-wrap">
                  {change.diff.before}
                </code>
              </div>
              <div className="bg-green-950/20 p-3 rounded border border-green-500/10">
                <div className="text-[10px] text-green-400 mb-2 uppercase font-medium">
                  New Content
                </div>
                <code className="text-xs text-green-200/70 font-mono whitespace-pre-wrap">
                  {change.diff.after}
                </code>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-white"
                asChild
              >
                <a href={change.url} target="_blank" rel="noreferrer">
                  View Source Page <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
