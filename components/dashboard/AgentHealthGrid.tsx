"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Search,
  Users,
  MessageSquare,
  Activity,
  ArrowRight,
  ShieldAlert,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * AgentHealthGrid - Mini Cards for Agent Status
 */

interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "inactive";
  lastActive: string;
}

const ICONS: Record<string, React.ReactNode> = {
  lead_gen: <Users className="w-4 h-4" />,
  seo: <Search className="w-4 h-4" />,
  customer_success: <MessageSquare className="w-4 h-4" />,
  partnership: <Users className="w-4 h-4" />,
  competitor_intel: <ShieldAlert className="w-4 h-4" />,
  revenue_recovery: <Activity className="w-4 h-4" />,
  onboarding: <ArrowRight className="w-4 h-4" />,
  proposal: <FileText className="w-4 h-4" />,
};

export function AgentHealthGrid() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/dashboard/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data.data?.agents || []);
    } catch {
      console.error("Failed to fetch agents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm h-[500px] flex flex-col">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-sm font-medium text-white flex justify-between items-center">
          <span>Agent Health</span>
          <Badge
            variant="outline"
            className="text-xs text-blue-400 border-blue-500/20 bg-blue-500/10"
          >
            {agents.length} Agents
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 w-2/3 rounded" />
                  <div className="h-2 bg-white/5 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-px bg-white/5">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.type}`}
                className="group p-4 bg-[#0F0F10] hover:bg-white/5 transition-colors flex items-start gap-3 relative"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    agent.status === "healthy"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : agent.status === "degraded"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-gray-500/10 border-gray-500/20 text-gray-400",
                  )}
                >
                  {ICONS[agent.type] || <Bot className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors">
                      {agent.name}
                    </span>
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        agent.status === "healthy"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : agent.status === "degraded"
                            ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : "bg-gray-600",
                      )}
                    />
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    Last active {agent.lastActive}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
