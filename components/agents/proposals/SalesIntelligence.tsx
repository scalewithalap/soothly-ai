"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Target, Lightbulb, ShieldAlert, Users } from "lucide-react";

/**
 * SalesIntelligence - Right Pane for Proposal Generator Agent
 * Deep dive into prospect needs and strategy.
 */

export interface AnalysisData {
  companyName: string;
  industry: string;
  companySize: string;
  painPoints: string[];
  valueProps: Array<{ pain: string; solution: string }>;
  objections: string[];
  strategyAngle: string;
}

interface SalesIntelligenceProps {
  analysis?: AnalysisData;
  isLoading?: boolean;
}

export function SalesIntelligence({
  analysis,
  isLoading,
}: SalesIntelligenceProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="space-y-4 animate-pulse text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full mx-auto" />
          <div className="h-4 bg-white/10 w-32 mx-auto rounded" />
          <p className="text-xs text-gray-500">Analyzing prospect website...</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          Intel & Strategy
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Company Profile */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-medium">
              <Building2 className="w-3.5 h-3.5" /> Company Profile
            </div>
            <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Industry</span>
                <span className="text-gray-200">{analysis.industry}</span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Size</span>
                <span className="text-gray-200 capitalize">
                  {analysis.companySize}
                </span>
              </div>
            </div>
          </section>

          {/* Pain Points */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-medium">
              <ShieldAlert className="w-3.5 h-3.5" /> Identified Pain Points
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.painPoints.map((pain, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-red-500/20 bg-red-500/5 text-gray-300 font-normal"
                >
                  {pain}
                </Badge>
              ))}
            </div>
          </section>

          {/* Strategy Angle */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-medium">
              <Lightbulb className="w-3.5 h-3.5" /> Winning Angle
            </div>
            <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-lg">
              <p className="text-sm text-purple-200 leading-relaxed italic">
                "{analysis.strategyAngle}"
              </p>
            </div>
          </section>

          <Separator className="bg-white/10" />

          {/* Anticipated Objections */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-medium">
              <Users className="w-3.5 h-3.5" /> Objection Handling
            </div>
            <div className="space-y-3">
              {analysis.objections.map((obj, i) => (
                <div key={i} className="text-xs">
                  <p className="text-red-400 mb-1">"{obj}"</p>
                  <p className="text-gray-500 pl-2 border-l-2 border-white/10">
                    Counter: Emphasize ROI speed and our automated onboarding.
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
