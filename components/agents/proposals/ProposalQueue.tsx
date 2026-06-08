"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * ProposalQueue - Left Pane for Proposal Generator Agent
 * List of active prospects and proposals.
 */

export interface Prospect {
  id: string;
  companyName: string;
  websiteUrl: string;
  status:
    | "analyzing"
    | "analyzed"
    | "proposal_ready"
    | "proposal_sent"
    | "proposal_accepted";
  proposalId?: string;
  value?: number;
  lastActivityAt: string;
  confidenceScore?: number;
}

interface ProposalQueueProps {
  prospects: Prospect[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAnalyze: (url: string) => void;
  isLoading?: boolean;
}

export function ProposalQueue({
  prospects,
  activeId,
  onSelect,
  onAnalyze,
  isLoading,
}: ProposalQueueProps) {
  const [search, setSearch] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const filtered = prospects.filter(
    (p) =>
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.websiteUrl.toLowerCase().includes(search.toLowerCase()),
  );

  const handleStartAnalysis = async () => {
    if (!newUrl) return;
    setIsAnalyzing(true);
    await onAnalyze(newUrl);
    setIsAnalyzing(false);
    setIsDialogOpen(false);
    setNewUrl("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F10] border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide text-white">
            Prospects
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6 border-white/10 hover:bg-white/5"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1C] border-white/10">
              <DialogHeader>
                <DialogTitle>Analyze New Prospect</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Website URL
                  </label>
                  <Input
                    placeholder="https://example.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="bg-black/20 border-white/10"
                  />
                  <p className="text-xs text-gray-500">
                    AI will scrape the site and identify key pain points and
                    value props.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartAnalysis}
                  disabled={!newUrl || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Analyzing...
                    </>
                  ) : (
                    "Start Analysis"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 focus:border-primary/50"
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
            {filtered.map((prospect) => {
              const isActive = activeId === prospect.id;
              return (
                <button
                  key={prospect.id}
                  onClick={() => onSelect(prospect.id)}
                  className={cn(
                    "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                    isActive && "bg-white/5 border-l-2 border-l-primary",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded flex items-center justify-center shrink-0 border text-xs font-bold",
                        isActive
                          ? "bg-primary/20 border-primary/30 text-primary"
                          : "bg-white/5 border-white/10 text-gray-400",
                      )}
                    >
                      {prospect.companyName.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={cn(
                            "font-medium text-sm truncate pr-2",
                            isActive ? "text-white" : "text-gray-300",
                          )}
                        >
                          {prospect.companyName}
                        </span>
                        {prospect.confidenceScore !== undefined && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              prospect.confidenceScore > 0.8
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-yellow-500/10 text-yellow-400",
                            )}
                          >
                            {Math.round(prospect.confidenceScore * 100)}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          {getStatusIcon(prospect.status)}
                          <span className="capitalize">
                            {prospect.status.replace("_", " ")}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-600">
                          {prospect.lastActivityAt}
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

function getStatusIcon(status: Prospect["status"]) {
  switch (status) {
    case "analyzing":
      return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
    case "proposal_ready":
      return <FileText className="w-3 h-3 text-purple-400" />;
    case "proposal_sent":
      return <ExternalLink className="w-3 h-3 text-yellow-400" />;
    case "proposal_accepted":
      return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    default:
      return <Clock className="w-3 h-3 text-gray-400" />;
  }
}
