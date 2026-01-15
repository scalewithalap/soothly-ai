"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Plus, Zap, Clock, Users } from "lucide-react";
import { useContent } from "@/hooks/use-content";

export default function DashboardPage() {
  const { content } = useContent();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/core/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCredits(data?.data?.balance || 0))
      .catch(() => setCredits(0));
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-gray-900 dark:text-white">
            {content.dashboard.welcomeMessage.replace("{firstName}", "Alex")}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {content.dashboard.welcomeSubtext}
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {content.dashboard.newAgent}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <Zap className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {content.dashboard.stats.totalCredits}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {credits !== null ? credits.toLocaleString() : "..."}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {content.dashboard.stats.activeAgents}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                8
              </h3>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {content.dashboard.stats.timeSaved}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                124h
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity & Active Agents Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Agents List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-heading">
            {content.dashboard.agentStatus.title}
          </h2>
          <div className="grid gap-4">
            {[
              {
                id: "leadGeneration",
                status: "Active",
                timeKey: "twoMinutesAgo",
                seed: "Felix",
              },
              {
                id: "seoContent",
                status: "Active",
                timeKey: "fifteenMinutesAgo",
                seed: "Aneka",
              },
              {
                id: "dataScraper",
                status: "Paused",
                timeKey: "oneHourAgo",
                seed: "Bailey",
              },
            ].map((agent, i) => {
              // Helper to access nested keys safely would be better, but explicit mapping is safe
              const agentContent =
                content.agents[agent.id as keyof typeof content.agents];
              const timeText =
                content.mockData.time[
                  agent.timeKey as keyof typeof content.mockData.time
                ];

              return (
                <Card
                  key={i}
                  className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.seed}`}
                      fallback={agentContent.name.substring(0, 2)}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {agentContent.short}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {agent.status === "Active"
                          ? content.dashboard.agentStatus.active
                          : content.dashboard.agentStatus.paused}{" "}
                        • {content.dashboard.agentStatus.lastActive} {timeText}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={agent.status === "Active" ? "success" : "warning"}
                  >
                    {agent.status === "Active"
                      ? content.dashboard.agentStatus.active
                      : content.dashboard.agentStatus.paused}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-heading">
              {content.dashboard.recentActivity.title}
            </h2>
            <Button variant="ghost" size="sm" className="text-violet-600">
              {content.dashboard.recentActivity.viewAll}
            </Button>
          </div>

          <Card className="divide-y divide-gray-100 dark:divide-gray-800 p-0 overflow-hidden">
            {[
              {
                textKey: 0,
                timeKey: "twoHoursAgo",
              },
              {
                textKey: 1,
                timeKey: "fiveHoursAgo",
              },
              { textKey: 2, timeKey: "oneDayAgo" },
              { textKey: 3, timeKey: "oneDayAgo" },
            ].map((activity, i) => {
              const text =
                content.dashboard.recentActivity.items[activity.textKey];
              const time =
                content.mockData.time[
                  activity.timeKey as keyof typeof content.mockData.time
                ];

              return (
                <div
                  key={i}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{time}</p>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
