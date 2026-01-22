"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  Activity,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

/**
 * MetricCards - Top Row of Global Dashboard
 */

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

const ICONS: Record<string, React.ReactNode> = {
  "Total Revenue": <DollarSign className="w-5 h-5 text-emerald-400" />,
  "Active Agents": <Bot className="w-5 h-5 text-blue-400" />,
  "Tasks Completed": <Activity className="w-5 h-5 text-purple-400" />,
  "System Health": <Activity className="w-5 h-5 text-green-400" />,
};

export function MetricCards() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setMetrics(data.data?.metrics || []);
    } catch {
      console.error("Failed to fetch metrics");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="bg-black/40 border-white/10 backdrop-blur-sm animate-pulse"
          >
            <CardHeader className="pb-2">
              <div className="h-4 bg-white/10 rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-white/10 rounded w-16 mb-2" />
              <div className="h-3 bg-white/5 rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, i) => (
        <Card key={i} className="bg-black/40 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {metric.label}
            </CardTitle>
            {ICONS[metric.label] || (
              <Activity className="w-5 h-5 text-gray-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              {metric.value}
            </div>
            <div className="flex items-center text-xs">
              {metric.trend === "up" && (
                <ArrowUpRight className="w-3 h-3 text-emerald-500 mr-1" />
              )}
              {metric.trend === "down" && (
                <ArrowDownRight className="w-3 h-3 text-red-500 mr-1" />
              )}
              <span
                className={
                  metric.trend === "up"
                    ? "text-emerald-500"
                    : metric.trend === "down"
                      ? "text-red-500"
                      : "text-gray-500"
                }
              >
                {metric.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
