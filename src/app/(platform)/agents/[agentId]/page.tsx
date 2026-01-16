"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Activity,
  Clock,
  Zap,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Play,
  Pause,
} from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { toast } from "sonner";

interface AgentConfig {
  agent_type: string;
  is_active: boolean;
  autonomy_level: "wait" | "ai_decides" | "always_proceed";
  total_tasks_completed: number;
  total_credits_used: number;
  total_value_generated: number;
  last_run_at: string | null;
}

interface AgentStats {
  successRate: number;
  totalRuns: number;
  avgCreditsPerRun: number;
  estimatedHoursSaved: number;
}

interface Thought {
  id: string;
  thought_type: string;
  message: string;
  icon: string;
  created_at: string;
}

interface Activity {
  id: string;
  status: string;
  description: string;
  created_at: string;
}

// Agent names mapping
const AGENT_NAMES: Record<string, string> = {
  leadGeneration: "Lead Generation",
  seoContent: "SEO Content",
  partnerships: "Partnerships",
  contractReview: "Contract Review",
  regulatoryMonitoring: "Regulatory Monitoring",
  accountsReceivable: "Accounts Receivable",
  spendAnalysis: "Spend Analysis",
  dynamicPricing: "Dynamic Pricing",
  dataScraper: "Data Scraper",
};

export default function AgentStatsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const { content } = useContent();
  const t = content.agentsPage?.statsPage || {};
  const tAuto = content.agentsPage?.autonomy || {};
  const tToasts = content.agentsPage?.toasts || {};

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [toggling, setToggling] = useState(false);

  // Fetch agent data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/agents/${agentId}/stats`);
        if (!response.ok) throw new Error("Failed to fetch");

        const { data } = await response.json();
        setConfig(data.config);
        setStats(data.stats);
        setActivities(data.recentActivities || []);
      } catch (error) {
        console.error("Failed to fetch agent stats:", error);
        toast.error("Failed to load agent data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [agentId]);

  // Fetch thoughts separately for real-time updates
  useEffect(() => {
    async function fetchThoughts() {
      try {
        const response = await fetch(
          `/api/agents/${agentId}/thoughts?limit=50`,
        );
        if (!response.ok) return;

        const { data } = await response.json();
        setThoughts(data.thoughts || []);
      } catch (error) {
        console.error("Failed to fetch thoughts:", error);
      }
    }

    fetchThoughts();
    // Poll for new thoughts every 5 seconds
    const interval = setInterval(fetchThoughts, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  // Toggle agent active state
  const handleToggle = async (action: "activate" | "deactivate") => {
    setToggling(true);
    try {
      const response = await fetch("/api/agents/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: agentId, action }),
      });

      if (!response.ok) throw new Error("Failed to toggle");

      const { data } = await response.json();
      setConfig(data.config);
      toast.success(
        action === "activate" ? tToasts.activated : tToasts.deactivated,
      );
    } catch (error) {
      console.error("Failed to toggle agent:", error);
      toast.error(tToasts.error || "Failed to update agent");
    } finally {
      setToggling(false);
    }
  };

  // Set autonomy level
  const handleAutonomyChange = async (
    level: "wait" | "ai_decides" | "always_proceed",
  ) => {
    try {
      const response = await fetch("/api/agents/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: agentId,
          action: "set_autonomy",
          autonomyLevel: level,
        }),
      });

      if (!response.ok) throw new Error("Failed to update autonomy");

      const { data } = await response.json();
      setConfig(data.config);
      toast.success(tToasts.autonomyUpdated || "Autonomy level updated");
    } catch (error) {
      console.error("Failed to update autonomy:", error);
      toast.error(tToasts.error || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const agentName = AGENT_NAMES[agentId] || agentId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/agents")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToAgents || "Back to Agents"}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {agentName}
            </h1>
            <p className="text-sm text-gray-500">
              {t.title || "Agent Statistics"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config?.is_active ? (
            <Button
              variant="outline"
              onClick={() => handleToggle("deactivate")}
              disabled={toggling}
              className="gap-2"
            >
              {toggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              Pause Agent
            </Button>
          ) : (
            <Button
              onClick={() => handleToggle("activate")}
              disabled={toggling}
              className="gap-2"
            >
              {toggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Launch Agent
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t.successRate || "Success Rate"}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.successRate || 0}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t.totalRuns || "Total Runs"}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.totalRuns?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t.avgCreditsPerRun || "Avg Credits/Run"}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.avgCreditsPerRun || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t.hoursSaved || "Hours Saved"}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.estimatedHoursSaved || 0}h
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Value Generated Banner */}
      <Card className="p-6 bg-linear-to-r from-violet-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Total Value Generated</p>
            <p className="text-3xl font-bold">
              ${(config?.total_value_generated || 0).toLocaleString()}
            </p>
          </div>
          <DollarSign className="w-12 h-12 text-white/30" />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Autonomy Controls */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {tAuto.title || "Autonomy Level"}
          </h3>
          <div className="space-y-3">
            {[
              {
                level: "wait" as const,
                label: tAuto.wait,
                desc: tAuto.waitDesc,
              },
              {
                level: "ai_decides" as const,
                label: tAuto.aiDecides,
                desc: tAuto.aiDecidesDesc,
              },
              {
                level: "always_proceed" as const,
                label: tAuto.alwaysProceed,
                desc: tAuto.alwaysProceedDesc,
              },
            ].map(({ level, label, desc }) => (
              <button
                key={level}
                onClick={() => handleAutonomyChange(level)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  config?.autonomy_level === level
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {label || level}
                    </p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  {config?.autonomy_level === level && (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Thought Stream */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t.thoughtStream || "Thought Stream"}
          </h3>
          <div className="h-[300px] overflow-y-auto space-y-2">
            {thoughts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t.noThoughts ||
                  "No activity yet. Launch the agent to see its thinking process."}
              </p>
            ) : (
              thoughts.map((thought) => (
                <div
                  key={thought.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <span className="text-lg">{thought.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-mono">
                      {thought.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(thought.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t.recentActivity || "Recent Activity"}
        </h3>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  {activity.status === "completed" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : activity.status === "failed" ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {activity.description}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
