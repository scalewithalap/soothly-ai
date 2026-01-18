"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Play,
  Pause,
  Settings,
  FileText,
  Zap,
  Target,
  FileSearch,
  Shield,
  Receipt,
  TrendingDown,
  DollarSign,
  Database,
  Users,
} from "lucide-react";
import { useContent } from "@/hooks/use-content";

// Agent icon mapping
const AGENT_ICONS: Record<string, React.ReactNode> = {
  leadGeneration: <Target className="w-6 h-6" />,
  seoContent: <FileSearch className="w-6 h-6" />,
  partnerships: <Users className="w-6 h-6" />,
  contractReview: <FileText className="w-6 h-6" />,
  regulatoryMonitoring: <Shield className="w-6 h-6" />,
  accountsReceivable: <Receipt className="w-6 h-6" />,
  spendAnalysis: <TrendingDown className="w-6 h-6" />,
  dynamicPricing: <DollarSign className="w-6 h-6" />,
  dataScraper: <Database className="w-6 h-6" />,
};

// Agent color mapping
const AGENT_COLORS: Record<string, string> = {
  leadGeneration: "from-[#9382FF] to-[#8B5CF6]",
  seoContent: "from-blue-500 to-cyan-500",
  partnerships: "from-emerald-500 to-teal-500",
  contractReview: "from-amber-500 to-orange-500",
  regulatoryMonitoring: "from-rose-500 to-pink-500",
  accountsReceivable: "from-green-500 to-emerald-500",
  spendAnalysis: "from-indigo-500 to-blue-500",
  dynamicPricing: "from-fuchsia-500 to-pink-500",
  dataScraper: "from-slate-500 to-gray-600",
};

interface AgentData {
  id: string;
  status: "active" | "paused" | "setup";
  lastRun: string | null;
  creditsUsed: number;
  tasksCompleted: number;
}

// Mock data - replace with API call
const MOCK_AGENT_DATA: Record<string, AgentData> = {
  leadGeneration: {
    id: "leadGeneration",
    status: "active",
    lastRun: "2h ago",
    creditsUsed: 450,
    tasksCompleted: 127,
  },
  seoContent: {
    id: "seoContent",
    status: "active",
    lastRun: "15m ago",
    creditsUsed: 230,
    tasksCompleted: 54,
  },
  partnerships: {
    id: "partnerships",
    status: "paused",
    lastRun: "1d ago",
    creditsUsed: 120,
    tasksCompleted: 23,
  },
  contractReview: {
    id: "contractReview",
    status: "setup",
    lastRun: null,
    creditsUsed: 0,
    tasksCompleted: 0,
  },
  regulatoryMonitoring: {
    id: "regulatoryMonitoring",
    status: "setup",
    lastRun: null,
    creditsUsed: 0,
    tasksCompleted: 0,
  },
  accountsReceivable: {
    id: "accountsReceivable",
    status: "paused",
    lastRun: "3d ago",
    creditsUsed: 85,
    tasksCompleted: 31,
  },
  spendAnalysis: {
    id: "spendAnalysis",
    status: "setup",
    lastRun: null,
    creditsUsed: 0,
    tasksCompleted: 0,
  },
  dynamicPricing: {
    id: "dynamicPricing",
    status: "setup",
    lastRun: null,
    creditsUsed: 0,
    tasksCompleted: 0,
  },
  dataScraper: {
    id: "dataScraper",
    status: "active",
    lastRun: "1h ago",
    creditsUsed: 380,
    tasksCompleted: 89,
  },
};

export default function AgentsPage() {
  const { content } = useContent();
  const t = content.agentsPage || {};
  const agentDefs = content.agents || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all",
  );
  const [agentData] = useState<Record<string, AgentData>>(MOCK_AGENT_DATA);

  // Filter agents
  const agentKeys = Object.keys(agentDefs);
  const filteredAgents = agentKeys.filter((key) => {
    const agent = agentDefs[key as keyof typeof agentDefs];
    const data = agentData[key];

    // Search filter
    const matchesSearch =
      agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.short?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && data?.status === "active") ||
      (statusFilter === "paused" &&
        (data?.status === "paused" || data?.status === "setup"));

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AgentData["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="success" className="gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t.statusActive || "Active"}
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="warning" className="gap-1">
            <Pause className="w-3 h-3" />
            {t.statusPaused || "Paused"}
          </Badge>
        );
      case "setup":
        return (
          <Badge variant="info" className="gap-1">
            <Settings className="w-3 h-3" />
            {t.statusSetup || "Setup Required"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading text-gray-900 dark:text-white">
          {t.title || "Your AI Agents"}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t.subtitle ||
            "Configure, launch, and monitor your autonomous business agents."}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder || "Search agents..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9382FF]/20 focus:border-[#9382FF] text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "paused"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className="capitalize"
            >
              {filter === "all"
                ? t.filterAll || "All"
                : filter === "active"
                  ? t.filterActive || "Active"
                  : t.filterPaused || "Paused"}
            </Button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t.emptyState || "No agents match your search."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((key) => {
            const agent = agentDefs[key as keyof typeof agentDefs];
            const data = agentData[key] || {
              status: "setup",
              lastRun: null,
              creditsUsed: 0,
              tasksCompleted: 0,
            };
            const gradientClass =
              AGENT_COLORS[key] || "from-gray-500 to-gray-600";

            return (
              <Card
                key={key}
                className="group relative overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-[#9382FF]/40 dark:hover:border-[#9382FF]/40 transition-all hover:shadow-lg"
              >
                {/* Gradient accent */}
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${gradientClass}`}
                />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl bg-linear-to-br ${gradientClass} text-white`}
                      >
                        {AGENT_ICONS[key] || <Zap className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {agent.name}
                        </h3>
                        {getStatusBadge(data.status)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {agent.short}
                  </p>

                  {/* Stats */}
                  {data.status !== "setup" && (
                    <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.lastRunLabel || "Last run"}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {data.lastRun || "—"}
                        </p>
                      </div>
                      <div className="text-center border-x border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.creditsUsedLabel || "Credits"}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {data.creditsUsed.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.tasksCompletedLabel || "Tasks"}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {data.tasksCompleted.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {data.status === "setup" ? (
                      <Button className="flex-1 gap-2">
                        <Settings className="w-4 h-4" />
                        {t.configureButton || "Configure"}
                      </Button>
                    ) : data.status === "active" ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                        >
                          <Pause className="w-4 h-4" />
                          {t.pauseButton || "Pause"}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <FileText className="w-4 h-4" />
                          {t.viewLogsButton || "Logs"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" className="flex-1 gap-1">
                          <Play className="w-4 h-4" />
                          {t.launchButton || "Launch"}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <FileText className="w-4 h-4" />
                          {t.viewLogsButton || "Logs"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
