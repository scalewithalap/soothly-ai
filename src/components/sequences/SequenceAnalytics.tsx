"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { Loader2, Mail, MousePointerClick, MessageSquare } from "lucide-react";

interface SequenceAnalyticsProps {
  sequenceId: string;
}

// Mock data generator (since we haven't implemented the full analytics API route yet)
const generateMockData = () => {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  return dates.map((date) => ({
    date,
    sent: Math.floor(Math.random() * 50) + 10,
    opened: Math.floor(Math.random() * 30) + 5,
    clicked: Math.floor(Math.random() * 10),
    replied: Math.floor(Math.random() * 5),
  }));
};

export function SequenceAnalytics({ sequenceId }: SequenceAnalyticsProps) {
  const [data, setData] = useState<{
    timeSeries: {
      date: string;
      sent: number;
      opened: number;
      clicked: number;
      replied: number;
    }[];
    summary: {
      sent: number;
      openRate: number;
      clickRate: number;
      replyRate: number;
      bounceRate: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetch
    const loadData = async () => {
      // In real app: const res = await fetch(`/api/sequences/${sequenceId}/analytics`);
      // For now simulation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const timeSeries = generateMockData();
      const totals = timeSeries.reduce(
        (acc, curr) => ({
          sent: acc.sent + curr.sent,
          opened: acc.opened + curr.opened,
          clicked: acc.clicked + curr.clicked,
          replied: acc.replied + curr.replied,
        }),
        { sent: 0, opened: 0, clicked: 0, replied: 0 },
      );

      setData({
        timeSeries,
        summary: {
          sent: totals.sent,
          openRate: (totals.opened / totals.sent) * 100,
          clickRate: (totals.clicked / totals.sent) * 100,
          replyRate: (totals.replied / totals.sent) * 100,
          bounceRate: 2.5, // Mock
        },
      });
      setIsLoading(false);
    };
    loadData();
  }, [sequenceId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              <Mail className="h-4 w-4 mr-2" /> Total Sent
            </span>
            <span className="text-2xl font-bold">
              {data.summary.sent.toLocaleString()}
            </span>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              <span className="text-xl mr-2">👀</span> Open Rate
            </span>
            <span className="text-2xl font-bold text-blue-500">
              {data.summary.openRate.toFixed(1)}%
            </span>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              <MousePointerClick className="h-4 w-4 mr-2" /> Click Rate
            </span>
            <span className="text-2xl font-bold text-green-500">
              {data.summary.clickRate.toFixed(1)}%
            </span>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" /> Reply Rate
            </span>
            <span className="text-2xl font-bold text-purple-500">
              {data.summary.replyRate.toFixed(1)}%
            </span>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Engagement Over Time</h3>
          <p className="text-sm text-muted-foreground">
            Daily sent, open, and reply metrics
          </p>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                }}
                itemStyle={{ fontSize: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#888888"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="opened"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="replied"
                stroke="#a855f7"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
