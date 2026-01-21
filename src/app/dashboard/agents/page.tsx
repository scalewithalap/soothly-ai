"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  Handshake,
  ArrowRight,
  Activity,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AgentStats {
  agent_type: string;
  running: number;
  pending_approvals: number;
}

const agents = [
  {
    id: "leads",
    type: "lead_gen",
    name: "Lead Generation",
    description:
      "Find, enrich, and reach ideal customers with automated outreach campaigns.",
    icon: Users,
    href: "/dashboard/agents/leads",
    color: "from-indigo-500/20 to-blue-500/20",
    borderColor: "hover:border-indigo-500/50",
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
  },
  {
    id: "content",
    type: "seo",
    name: "SEO Content",
    description:
      "Research keywords and publish SEO-optimized articles automatically.",
    icon: FileText,
    href: "/dashboard/agents/seo",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "hover:border-emerald-500/50",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    id: "partners",
    type: "partnership",
    name: "Partnerships",
    description: "Discover and recruit affiliates and technology partners.",
    icon: Handshake,
    href: "/dashboard/agents/partners",
    color: "from-pink-500/20 to-purple-500/20",
    borderColor: "hover:border-pink-500/50",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-400",
  },
];

export default function AgentsIndexPage() {
  const [agentStats, setAgentStats] = useState<Record<string, AgentStats>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgentStats();
  }, []);

  const fetchAgentStats = async () => {
    try {
      // Fetch jobs summary
      const jobsRes = await fetch("/api/agents/jobs?limit=100");
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const activities = jobsData.activities || [];

        // Count running jobs per agent type
        const stats: Record<string, AgentStats> = {};
        for (const activity of activities) {
          const type = activity.agent_type;
          if (!stats[type]) {
            stats[type] = {
              agent_type: type,
              running: 0,
              pending_approvals: 0,
            };
          }
          if (activity.status === "running") {
            stats[type].running++;
          }
        }
        setAgentStats(stats);
      }

      // Fetch pending approvals
      const approvalsRes = await fetch("/api/approvals?status=pending");
      if (approvalsRes.ok) {
        const approvalsData = await approvalsRes.json();
        setPendingCount(approvalsData.pending_count || 0);

        // Count per agent type
        for (const approval of approvalsData.approvals || []) {
          const type = approval.agent_type;
          setAgentStats((prev) => ({
            ...prev,
            [type]: {
              ...prev[type],
              agent_type: type,
              running: prev[type]?.running || 0,
              pending_approvals: (prev[type]?.pending_approvals || 0) + 1,
            },
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch agent stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Pending Approvals Banner */}
      {pendingCount > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">
                {pendingCount} Pending Approval{pendingCount !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-gray-400">
                Actions waiting for your review
              </p>
            </div>
          </div>
          <Link href="/dashboard/agents/approvals">
            <Button variant="outline" size="sm" className="gap-2">
              Review Now <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </Card>
      )}

      <div>
        <h1 className="text-3xl font-host font-bold text-white">AI Agents</h1>
        <p className="mt-2 text-gray-400">
          Select an agent to configure and monitor its automated workflows.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const stats = agentStats[agent.type];
          const hasActivity = stats?.running || stats?.pending_approvals;

          return (
            <Link
              key={agent.id}
              href={agent.href}
              className={`group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all ${agent.borderColor} hover:bg-white/10`}
            >
              <div
                className={`absolute inset-0 bg-linear-to-br ${agent.color} opacity-0 transition-opacity group-hover:opacity-100`}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${agent.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${agent.iconColor}`} />
                  </div>

                  {/* Activity Indicators */}
                  {!isLoading && hasActivity && (
                    <div className="flex gap-2">
                      {stats?.running > 0 && (
                        <Badge
                          variant="outline"
                          className="text-blue-400 border-blue-500/50 bg-blue-500/10 gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {stats.running}
                        </Badge>
                      )}
                      {stats?.pending_approvals > 0 && (
                        <Badge
                          variant="outline"
                          className="text-amber-400 border-amber-500/50 bg-amber-500/10 gap-1 animate-pulse"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {stats.pending_approvals}
                        </Badge>
                      )}
                    </div>
                  )}

                  {isLoading && (
                    <div className="w-16 h-5 bg-white/10 rounded animate-pulse" />
                  )}
                </div>

                <h3 className="mb-2 font-host text-xl font-bold text-white">
                  {agent.name}
                </h3>
                <p className="mb-4 text-sm text-gray-400">
                  {agent.description}
                </p>

                <div className="flex items-center text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  Open Agent
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
