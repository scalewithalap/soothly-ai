"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  BarChart,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PartnerScorecard - Right Pane for Partnership Agent
 * Visualizes `fit_score` and AI qualification analysis.
 */

interface FitBreakdown {
  audience_overlap: number;
  product_fit: number;
  brand_alignment: number;
  market_reach: number;
}

interface QualificationResult {
  fit_score: number;
  breakdown: FitBreakdown;
  strengths: string[];
  concerns: string[];
  recommendation: "proceed" | "maybe" | "pass";
  reasoning: string;
}

interface PartnerScorecardProps {
  partnerName?: string;
  qualification?: QualificationResult;
}

export function PartnerScorecard({
  partnerName = "Partner",
  qualification,
}: PartnerScorecardProps) {
  // Default / Loading State
  if (!qualification) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-black/20 text-center">
        <div className="space-y-4">
          <Brain className="w-8 h-8 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Analysing partnership fit...
          </p>
        </div>
      </div>
    );
  }

  const { fit_score, breakdown, strengths, concerns, recommendation } =
    qualification;

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 60)
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Fit Analysis
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Top Score */}
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
                  className={cn(getScoreColor(fit_score).split(" ")[0])}
                  strokeWidth="8"
                  strokeDasharray={365}
                  strokeDashoffset={365 - (365 * fit_score) / 100}
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
                  {fit_score}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Score
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider border",
                  getScoreColor(fit_score),
                )}
              >
                Recommendation: {recommendation}
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Breakdown Bars */}
          <section className="space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart className="w-3.5 h-3.5" /> Breakdown
            </h3>

            <div className="space-y-3">
              <ScoreRow
                label="Audience Overlap"
                score={breakdown.audience_overlap}
              />
              <ScoreRow label="Product Fit" score={breakdown.product_fit} />
              <ScoreRow
                label="Brand Alignment"
                score={breakdown.brand_alignment}
              />
              <ScoreRow label="Market Reach" score={breakdown.market_reach} />
            </div>
          </section>

          <Separator className="bg-white/10" />

          {/* AI Analysis */}
          <section className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
              </h4>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2 leading-snug"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> Concerns
              </h4>
              <ul className="space-y-2">
                {concerns.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2 leading-snug"
                  >
                    <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-mono">{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
