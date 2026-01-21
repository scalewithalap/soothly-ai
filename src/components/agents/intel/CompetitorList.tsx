"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Globe,
  Activity,
  AlertTriangle,
  Plus,
  Loader2,
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
import { Label } from "@/components/ui/label";
import Image from "next/image";

/**
 * CompetitorList - Left Pane for Intel Agent
 * Displays list of monitored competitors.
 */

export interface Competitor {
  id: string;
  name: string;
  url: string;
  status: "active" | "scanning" | "error" | "idle";
  alertCount: number;
  lastScannedAt: string;
  logoUrl?: string;
}

interface CompetitorListProps {
  competitors: Competitor[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAdd: (url: string) => void;
  isLoading?: boolean;
}

export function CompetitorList({
  competitors,
  activeId,
  onSelect,
  onAdd,
  isLoading,
}: CompetitorListProps) {
  const [search, setSearch] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filtered = competitors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.url.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = () => {
    if (newUrl) {
      onAdd(newUrl);
      setNewUrl("");
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">
            Monitored Sites
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-dashed border-white/20 hover:border-white/40"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Track New Competitor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input
                    placeholder="https://competitor.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="bg-black/20 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAdd}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  start Monitoring
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter list..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 focus:border-primary/50"
          />
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
          filtered.map((comp) => {
            const isActive = activeId === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => onSelect(comp.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                  isActive && "bg-white/10 border-l-2 border-l-primary",
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded flex items-center justify-center text-xs font-bold shrink-0 bg-white p-1",
                    )}
                  >
                    {comp.logoUrl ? (
                      <Image
                        src={comp.logoUrl}
                        className="w-full h-full object-contain"
                        alt={comp.name}
                      />
                    ) : (
                      <Globe className="w-5 h-5 text-gray-400" />
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
                        {comp.name}
                      </span>
                      {comp.alertCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 px-1.5 text-[10px]"
                        >
                          {comp.alertCount}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
                        {comp.status === "scanning" ? (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        ) : comp.status === "error" ? (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Activity className="w-3 h-3" />
                        )}
                        <span className="truncate flex-1">
                          {comp.url.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
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
