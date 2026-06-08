"use client";

import { MetricCards } from "@/components/dashboard/MetricCards";
import { ActivityStream } from "@/components/dashboard/ActivityStream";
import { AgentHealthGrid } from "@/components/dashboard/AgentHealthGrid";
import { Button } from "@/components/ui/button";
import { Plus, Users, Target } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090B] overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-gray-400 text-sm">
              Welcome back, Organization Owner
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              <Users className="w-4 h-4 mr-2" /> Invite Team
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </div>
        </div>

        {/* Top Row: Metrics */}
        <MetricCards />

        {/* Middle Row: Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          {/* Left: Activity Stream (2 cols) */}
          <div className="lg:col-span-2 h-full">
            <ActivityStream />
          </div>

          {/* Right: Agent Health (1 col) */}
          <div className="lg:col-span-1 h-full">
            <AgentHealthGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
