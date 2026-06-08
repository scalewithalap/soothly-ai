"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ActivityStream - Unified Feed of Agent Actions
 */

interface FeedItem {
  id: string;
  agentType: string;
  action: string;
  message: string;
  timestamp: string;
  status: "success" | "warning" | "error";
}

export function ActivityStream() {
  const [activities, setActivities] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const response = await fetch("/api/dashboard/activity");
      if (!response.ok) throw new Error("Failed to fetch activity");
      const data = await response.json();
      setActivities(data.data?.activities || []);
    } catch {
      console.error("Failed to fetch activity");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl backdrop-blur-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Live Activity
        </h3>
        <Badge
          variant="outline"
          className="text-xs text-gray-500 border-white/10"
        >
          Real-time
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 w-2/3 rounded" />
                  <div className="h-2 bg-white/5 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activities.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-white/5 transition-colors flex gap-3"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                    item.status === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : item.status === "warning"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400",
                  )}
                >
                  {getAgentIcon(item.agentType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-medium text-sm text-gray-200 truncate">
                      {item.action}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {item.message}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1 bg-white/5 text-gray-500 uppercase tracking-tighter"
                    >
                      {item.agentType.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function getAgentIcon(type: string) {
  switch (type) {
    case "customer_success":
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <Bot className="w-4 h-4" />;
  }
}
