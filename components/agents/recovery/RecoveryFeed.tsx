"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * RecoveryFeed - Left Pane for Revenue Recovery Agent
 * List of failed payments and recovery status.
 */

export interface Recovery {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  currency: string;
  failureCode: string; // generic_decline, insufficient_funds, etc.
  status:
    | "pending"
    | "link_sent"
    | "recovered"
    | "failed"
    | "card_updated"
    | "blocked";
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: string;
  riskLevel: "low" | "medium" | "high";
}

interface RecoveryFeedProps {
  recoveries: Recovery[];
  activeId?: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

const STATUS_FILTERS = ["all", "at_risk", "recovered", "failed"] as const;

export function RecoveryFeed({
  recoveries,
  activeId,
  onSelect,
  isLoading,
}: RecoveryFeedProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filtered = recoveries.filter((r) => {
    const matchesSearch =
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceId.includes(search);

    if (filter === "all") return matchesSearch;
    if (filter === "at_risk")
      return (
        matchesSearch && (r.status === "pending" || r.status === "link_sent")
      );
    if (filter === "recovered")
      return matchesSearch && r.status === "recovered";
    if (filter === "failed")
      return matchesSearch && (r.status === "failed" || r.status === "blocked");
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">
            Failed Payments
          </h2>
          <Badge
            variant="outline"
            className="border-red-500/30 text-red-400 bg-red-500/10 text-[10px]"
          >
            {filtered.filter((r) => r.status === "pending").length} Actions
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 focus:border-red-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] uppercase font-medium tracking-wider whitespace-nowrap transition-colors",
                filter === f
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent",
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
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
          filtered.map((recovery) => {
            const isActive = activeId === recovery.id;
            return (
              <button
                key={recovery.id}
                onClick={() => onSelect(recovery.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                  isActive && "bg-white/10 border-l-2 border-l-red-500",
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Status */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded flex items-center justify-center shrink-0 border",
                      getStatusColor(recovery.status),
                    )}
                  >
                    {getStatusIcon(recovery.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "font-medium text-sm truncate pr-2",
                          isActive ? "text-white" : "text-gray-300",
                        )}
                      >
                        {recovery.customerName}
                      </span>
                      <span className="font-mono text-xs text-white">
                        {recovery.currency === "USD" ? "$" : recovery.currency}
                        {recovery.amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-red-400 capitalize">
                          {recovery.failureCode.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {recovery.invoiceId}
                        </span>
                      </div>

                      {recovery.status === "pending" ||
                      recovery.status === "link_sent" ? (
                        <div className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                          Attempt {recovery.attempts}/{recovery.maxAttempts}
                        </div>
                      ) : null}
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

function getStatusColor(status: Recovery["status"]) {
  switch (status) {
    case "recovered":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    case "failed":
    case "blocked":
      return "bg-red-500/10 border-red-500/20 text-red-400";
    case "link_sent":
      return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    default:
      return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  }
}

function getStatusIcon(status: Recovery["status"]) {
  switch (status) {
    case "recovered":
      return <CheckCircle2 className="w-5 h-5" />;
    case "failed":
      return <AlertTriangle className="w-5 h-5" />;
    case "link_sent":
      return <CreditCard className="w-5 h-5" />;
    default:
      return <RotateCcw className="w-5 h-5" />;
  }
}
