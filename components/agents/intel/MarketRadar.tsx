"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Radar, Zap, TrendingDown, BarChart, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MarketRadar - Right Pane for Intel Agent
 * Visualizes market trends and competitor strategy.
 */

interface MarketMetadata {
  pricingAggression: number;
  featureVelocity: number;
  messagingShift: number;
  insight: string;
}

interface MarketRadarProps {
  competitorName?: string;
  data?: MarketMetadata;
}

export function MarketRadar({
  competitorName = "Competitor",
  data,
}: MarketRadarProps) {
  // Default / Loading State
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-black/20 text-center">
        <div className="space-y-4">
          <Radar className="w-8 h-8 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Analyzing market position...
          </p>
        </div>
      </div>
    );
  }

  const { pricingAggression, featureVelocity, messagingShift, insight } = data;

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Strategy Radar
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Radar Visualization (Simplified as bars for text UI) */}
          <section className="space-y-4">
            <h3 className="text-center text-sm font-medium text-gray-200 mb-6">
              {competitorName} Strategy Profile
            </h3>

            <DimensionBar
              label="Pricing Aggression"
              score={pricingAggression}
              icon={<TrendingDown className="w-3.5 h-3.5" />}
              color="bg-red-500"
            />
            <DimensionBar
              label="Feature Velocity"
              score={featureVelocity}
              icon={<Zap className="w-3.5 h-3.5" />}
              color="bg-blue-500"
            />
            <DimensionBar
              label="Messaging Shift"
              score={messagingShift}
              icon={<BarChart className="w-3.5 h-3.5" />}
              color="bg-purple-500"
            />
          </section>

          <Separator className="bg-white/10" />

          {/* AI Insight */}
          <section className="bg-linear-to-br from-primary/10 to-transparent p-4 rounded-lg border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-primary/20 text-primary">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">
                  Strategic Insight
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed font-serif italic">
                  "{insight}"
                </p>
              </div>
            </div>
          </section>

          {/* Activity Heatmap Mock */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Activity Heatmap (30 Days)
            </h3>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-sm",
                    i % 5 === 0
                      ? "bg-primary/60"
                      : i % 3 === 0
                        ? "bg-primary/20"
                        : "bg-white/5",
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function DimensionBar({
  label,
  score,
  icon,
  color,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs items-center">
        <span className="text-gray-400 flex items-center gap-2">
          {icon} {label}
        </span>
        <span className="text-white font-mono">{score}/10</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
          )}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}
