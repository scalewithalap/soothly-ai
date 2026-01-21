"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";

/**
 * HealthMonitor - Right Pane for Revenue Recovery Agent
 * Aggregate metrics on recovery performance.
 */

interface RecoveryStats {
  recoveryRate: number;
  totalRecovered: number;
  totalAtRisk: number;
  topFailureReasons: { reason: string; count: number }[];
}

interface HealthMonitorProps {
  stats?: RecoveryStats;
}

export function HealthMonitor({
  stats = {
    recoveryRate: 68,
    totalRecovered: 12450,
    totalAtRisk: 3200,
    topFailureReasons: [
      { reason: "Insufficient Funds", count: 45 },
      { reason: "Generic Decline", count: 32 },
      { reason: "Expired Card", count: 18 },
    ],
  },
}: HealthMonitorProps) {
  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Recovery Health
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Main Stat: Recovery Rate */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  className="text-white/5"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="58"
                  cx="64"
                  cy="64"
                />
                <circle
                  className="text-emerald-500"
                  strokeWidth="8"
                  strokeDasharray={365}
                  strokeDashoffset={365 - (365 * stats.recoveryRate) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="58"
                  cx="64"
                  cy="64"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-white">
                  {stats.recoveryRate}%
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Success Rate
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg text-center">
              <div className="text-emerald-400 text-lg font-bold">
                ${stats.totalRecovered.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">
                Recovered (Mo)
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-center">
              <div className="text-red-400 text-lg font-bold">
                ${stats.totalAtRisk.toLocaleString()}
              </div>
              <div className="text-[10px] text-red-500/50 uppercase tracking-wider">
                At Risk
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Failure Reasons */}
          <section className="space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5" /> Top Failures
            </h3>

            <div className="space-y-3">
              {stats.topFailureReasons.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{item.reason}</span>
                    <span className="text-white font-mono">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500/50 rounded-full"
                      style={{ width: `${(item.count / 50) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator className="bg-white/10" />

          <div className="bg-blue-500/5 p-4 rounded-lg flex gap-3 items-start border border-blue-500/10">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-200 leading-relaxed">
                AI Agent has automatically recovered <strong>$450.00</strong>{" "}
                this week without human intervention.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
