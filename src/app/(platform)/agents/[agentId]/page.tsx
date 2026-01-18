"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageSquare,
  BarChart3,
  Brain,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { ChatInterface } from "@/components/agents/ChatInterface";
import { useContent } from "@/hooks/use-content";
import { toast } from "sonner";
import type { NormalAgentType } from "@/agents/base/types";
import { AGENT_METADATA } from "@/agents/base/types";

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

interface ActivityItem {
  id: string;
  status: string;
  description: string;
  created_at: string;
}

// Agent icon mapping
const AGENT_ICONS: Record<string, React.ReactNode> = {
  leads: <TrendingUp className="w-5 h-5" />,
  content: <Brain className="w-5 h-5" />,
  partners: <Activity className="w-5 h-5" />,
  contracts: <AlertCircle className="w-5 h-5" />,
  compliance: <AlertCircle className="w-5 h-5" />,
  receivables: <DollarSign className="w-5 h-5" />,
  spend: <BarChart3 className="w-5 h-5" />,
  pricing: <TrendingUp className="w-5 h-5" />,
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const { content } = useContent();

  // Type-safe content access with fallbacks
  const agentsContent = (content as Record<string, unknown>).agentsPage as
    | Record<string, Record<string, string>>
    | undefined;
  const t = agentsContent?.statsPage || {};
  const tAuto = agentsContent?.autonomy || {};
  const tToasts = agentsContent?.toasts || {};
  const tTabs = agentsContent?.tabs || {};

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
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

  // Handle toggle
  async function handleToggle(action: "activate" | "deactivate") {
    setToggling(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error("Toggle failed");

      const { data } = await response.json();
      setConfig((prev) =>
        prev ? { ...prev, is_active: data.is_active } : null,
      );
      toast.success(
        action === "activate"
          ? tToasts.activated || "Agent activated"
          : tToasts.deactivated || "Agent paused",
      );
    } catch {
      toast.error(tToasts.toggleFailed || "Failed to toggle agent");
    } finally {
      setToggling(false);
    }
  }

  // Handle autonomy change
  async function handleAutonomyChange(
    level: "wait" | "ai_decides" | "always_proceed",
  ) {
    try {
      const response = await fetch(`/api/agents/${agentId}/autonomy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autonomy_level: level }),
      });

      if (!response.ok) throw new Error("Update failed");

      setConfig((prev) => (prev ? { ...prev, autonomy_level: level } : null));
      toast.success(tToasts.autonomyUpdated || "Autonomy level updated");
    } catch {
      toast.error(tToasts.autonomyFailed || "Failed to update autonomy");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9382FF]" />
      </div>
    );
  }

  // Get agent metadata
  const agentMeta = AGENT_METADATA[agentId as NormalAgentType];
  const agentName = agentMeta?.displayName || agentId;
  const agentIcon = AGENT_ICONS[agentId] || <Brain className="w-5 h-5" />;

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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#9382FF]/10 dark:bg-[#9382FF]/30 text-[#9382FF] dark:text-[#B8AEFF]">
              {agentIcon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {agentName}
              </h1>
              <p className="text-sm text-gray-500">
                {agentMeta?.shortDescription || t.title || "Agent Statistics"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config?.is_active ? "success" : "warning"}>
            {config?.is_active
              ? t.statusActive || "Active"
              : t.statusPaused || "Paused"}
          </Badge>
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
              {t.pauseAgent || "Pause Agent"}
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
              {t.activateAgent || "Activate Agent"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            {tTabs.overview || "Overview"}
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {tTabs.chat || "Chat"}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            {tTabs.settings || "Settings"}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">
                  {t.successRate || "Success Rate"}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.successRate || 0}%
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm">{t.totalRuns || "Total Runs"}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalRuns || 0}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">
                  {t.creditsUsed || "Credits Used"}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {config?.total_credits_used || 0}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{t.hoursSaved || "Hours Saved"}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.estimatedHoursSaved || 0}h
              </p>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t.recentActivity || "Recent Activity"}
            </h3>
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t.noActivity || "No recent activity"}
              </p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    {activity.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                      {activity.description}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <ChatInterface
            agentType={agentId as NormalAgentType}
            agentName={agentName}
            agentIcon={agentIcon}
            className="h-[600px]"
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          {/* Autonomy Control */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {tAuto.title || "Autonomy Level"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {tAuto.description ||
                "Control how much independence this agent has"}
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  value: "wait",
                  label: tAuto.waitLabel || "Ask First",
                  desc: tAuto.waitDesc || "Agent asks before every action",
                },
                {
                  value: "ai_decides",
                  label: tAuto.aiDecidesLabel || "AI Decides",
                  desc: tAuto.aiDecidesDesc || "Agent decides when to ask",
                },
                {
                  value: "always_proceed",
                  label: tAuto.alwaysProceedLabel || "Full Autonomy",
                  desc: tAuto.alwaysProceedDesc || "Agent acts independently",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    handleAutonomyChange(
                      option.value as "wait" | "ai_decides" | "always_proceed",
                    )
                  }
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    config?.autonomy_level === option.value
                      ? "border-[#9382FF] bg-[#9382FF]/10 dark:bg-[#9382FF]/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-[#9382FF]/40"
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{option.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Agent Info */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t.agentInfo || "Agent Information"}
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">
                  {t.lastRun || "Last Run"}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {config?.last_run_at
                    ? new Date(config.last_run_at).toLocaleString()
                    : t.never || "Never"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  {t.tasksCompleted || "Tasks Completed"}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {config?.total_tasks_completed || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  {t.valueGenerated || "Value Generated"}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  ${config?.total_value_generated?.toLocaleString() || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  {t.avgCredits || "Avg Credits/Run"}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {stats?.avgCreditsPerRun || 0}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
