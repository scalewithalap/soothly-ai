"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * OnboardingQueue - Left Pane for Onboarding Agent
 * List of users currently in the onboarding flow.
 */

export interface OnboardingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  progress: number; // 0-100
  status: "active" | "stalled" | "completed";
  signedUpAt: string;
  lastActivityAt: string;
}

interface OnboardingQueueProps {
  users: OnboardingUser[];
  activeId?: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function OnboardingQueue({
  users,
  activeId,
  onSelect,
  isLoading,
}: OnboardingQueueProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "stalled" | "completed"
  >("all");

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && u.status === statusFilter;
  });

  return (
    <div className="flex flex-col h-full bg-[#0F0F10] border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide text-white">
            Users in Onboarding
          </h2>
          <Badge
            variant="outline"
            className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px]"
          >
            {users.filter((u) => u.status === "active").length} Active
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 focus:border-blue-500/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-1">
          {(["all", "active", "stalled", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2 py-1 rounded text-[10px] uppercase font-medium tracking-wider transition-colors",
                statusFilter === s
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-white/10 w-2/3 rounded" />
                  <div className="h-2 bg-white/5 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((user) => {
              const isActive = activeId === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => onSelect(user.id)}
                  className={cn(
                    "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative",
                    isActive && "bg-white/5 border-l-2 border-l-blue-500",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border text-xs font-bold",
                        user.status === "completed"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : user.status === "stalled"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400",
                      )}
                    >
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm truncate text-gray-200">
                          {user.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 border-white/10 text-gray-400"
                        >
                          {user.role}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              user.progress === 100
                                ? "bg-emerald-500"
                                : user.progress >= 50
                                  ? "bg-blue-500"
                                  : "bg-yellow-500",
                            )}
                            style={{ width: `${user.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-8">
                          {user.progress}%
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
