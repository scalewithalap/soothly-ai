"use client";

import { useEffect, useState, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  Zap,
  Activity,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { LanguageContext } from "@/context/language-context";
import Link from "next/link";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AdminStats {
  totalUsers: number;
  tasksThisMonth: number;
  messagesThisMonth: number;
  creditBalance: number;
}

interface Analytics {
  creditUsage: { date: string; value: number }[];
  messages: { date: string; value: number }[];
  dau: { date: string; count: number }[];
  tasks: {
    byStatus: Record<string, number>;
    byAgent: Record<string, number>;
    total: number;
  };
  summary: {
    totalCreditsUsed: number;
    totalMessages: number;
    totalTasks: number;
    avgDailyActiveUsers: number;
  };
}

export default function AdminDashboardPage() {
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.admin || {}) as Record<
    string,
    string | Record<string, string>
  >;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartDays, setChartDays] = useState(30);

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/admin/analytics?days=${chartDays}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statsConfig = (t.stats as Record<string, string>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {(t.title as string) || "Admin Dashboard"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organization overview and management
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
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statsConfig.totalUsers || "Total Users"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.totalUsers || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statsConfig.tasksThisMonth || "Tasks This Month"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.tasksThisMonth || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statsConfig.messagesThisMonth || "Messages This Month"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.messagesThisMonth || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statsConfig.creditBalance || "Credit Balance"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.creditBalance?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Quick Actions
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Link href="/admin/users">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Users className="w-4 h-4" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/audit-log">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Activity className="w-4 h-4" />
              View Audit Log
            </Button>
          </Link>
          <Link href="/admin/coupons">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Zap className="w-4 h-4" />
              Manage Coupons
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline" className="w-full justify-start gap-2">
              <MessageSquare className="w-4 h-4" />
              API & Webhooks
            </Button>
          </Link>
        </div>
      </Card>

      {/* Analytics Charts */}
      {analytics && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics Overview
            </h2>
            <div className="flex gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={chartDays === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setChartDays(d);
                    fetchAnalytics();
                  }}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Credit Usage Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Credit Usage
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.creditUsage}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Message Volume Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Message Volume
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.messages}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Tasks by Agent Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Tasks by Agent
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(analytics.tasks.byAgent).map(
                      ([name, count]) => ({ name, count }),
                    )}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* DAU Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Daily Active Users
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dau}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
