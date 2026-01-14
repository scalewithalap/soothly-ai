"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Users,
  FileText,
  Handshake,
  RefreshCw,
} from "lucide-react";
import { useContext } from "react";
import { LanguageContext } from "@/context/language-context";

interface Activity {
  id: string;
  agent_type: string;
  action: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface Analytics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  creditsUsed: number;
  tasksByAgent: {
    leads: number;
    content: number;
    partners: number;
  };
}

interface ChartPoint {
  date: string;
  count: number;
}

export default function DashboardPage() {
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.dashboard || {}) as any;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0,
  });
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      // Fetch jobs/activities
      const jobsRes = await fetch("/api/agents/jobs?limit=10");
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setActivities(jobsData.activities);
        setSummary(jobsData.summary);
      }

      // Fetch analytics
      const analyticsRes = await fetch(
        `/api/analytics/agents?period=${period}`
      );
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.metrics);
        setChartData(analyticsData.chartData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "leads":
        return <Users className="w-4 h-4" />;
      case "content":
        return <FileText className="w-4 h-4" />;
      case "partners":
        return <Handshake className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t.status?.completed || "Completed"}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="error" className="gap-1">
            <XCircle className="w-3 h-3" />
            {t.status?.failed || "Failed"}
          </Badge>
        );
      case "running":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            {t.status?.running || "Running"}
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.title || "Dashboard"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.subtitle || "Monitor your AI agents and track performance"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {t.refresh || "Refresh"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.stats?.totalTasks || "Total Tasks"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.stats?.completed || "Completed"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.completed}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.stats?.running || "Running"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.running}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.stats?.creditsUsed || "Credits Used"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics?.creditsUsed || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Analytics Overview */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.analytics?.title || "Performance Analytics"}
              </h2>
            </div>
            <div className="flex gap-2">
              {["7d", "30d", "90d"].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
                </Button>
              ))}
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="h-48 flex items-end gap-1 mb-6">
            {chartData.length > 0 ? (
              chartData.map((point, i) => {
                const maxCount = Math.max(...chartData.map((p) => p.count), 1);
                const height = (point.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-linear-to-t from-violet-600 to-violet-400 rounded-t transition-all hover:from-violet-500 hover:to-violet-300"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${point.date}: ${point.count} tasks`}
                  />
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                {t.analytics?.noData || "No data for this period"}
              </div>
            )}
          </div>

          {/* Agent breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t.agents?.leads || "Leads"}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics?.tasksByAgent.leads || 0}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t.agents?.content || "Content"}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics?.tasksByAgent.content || 0}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Handshake className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t.agents?.partners || "Partners"}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics?.tasksByAgent.partners || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.activity?.title || "Recent Activity"}
            </h2>
          </div>

          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.slice(0, 8).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {getAgentIcon(activity.agent_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(activity.status)}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                {t.activity?.empty || "No recent activity"}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Success Rate Card */}
      {analytics && (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t.successRate?.title || "Success Rate"}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-600">
                  {analytics.successRate}%
                </span>
                <span className="text-gray-500">
                  ({analytics.completedTasks} / {analytics.totalTasks}{" "}
                  {t.successRate?.tasks || "tasks"})
                </span>
              </div>
            </div>
            <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-green-500 to-emerald-400 transition-all"
                style={{ width: `${analytics.successRate}%` }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
