"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, AlignLeft } from "lucide-react";

interface SeoHealthHubProps {
  seoScore: number;
  wordCount: number;
  targetWordCount: number;
  keyword: string;
  readabilityScore: number;
}

export function SeoHealthHub({
  seoScore,
  wordCount,
  targetWordCount,
  keyword,
  readabilityScore,
}: SeoHealthHubProps) {
  // Color logic
  const scoreColor =
    seoScore > 80
      ? "text-green-400 border-green-500/50"
      : seoScore > 50
        ? "text-amber-400 border-amber-500/50"
        : "text-red-400 border-red-500/50";

  return (
    <div className="p-4 space-y-6">
      {/* 1. SEO Score Gauge */}
      <div className="flex flex-col items-center justify-center space-y-2 py-4">
        <div
          className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 ${scoreColor} bg-white/5`}
        >
          <div className="text-center">
            <span className="text-4xl font-bold">{seoScore}</span>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              SEO Score
            </p>
          </div>
        </div>
      </div>

      {/* 2. Keyword check */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-4 h-4" />
            <CardTitle className="text-sm font-semibold">
              Keyword Analysis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">
              Primary: <span className="text-white font-medium">{keyword}</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[75%]" />
          </div>
          <p className="text-xs text-muted-foreground">
            Density: 1.8% (Target 1-2%)
          </p>
        </CardContent>
      </Card>

      {/* 3. Content Stats */}
      <Card className="bg-transparent border-white/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlignLeft className="w-4 h-4" />
            <CardTitle className="text-sm font-semibold">Stats</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-muted-foreground">Word Count</span>
            <span
              className={
                wordCount >= targetWordCount
                  ? "text-green-400"
                  : "text-amber-400"
              }
            >
              {wordCount} / {targetWordCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Readability</span>
            <span className="text-white">Grade {readabilityScore}</span>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
        💡 Tip: Add more subheadings to improve readability.
      </div>
    </div>
  );
}
