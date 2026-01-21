"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, User } from "lucide-react";

interface IntelligenceHubProps {
  sentimentScore: number;
  summary: string;
  tags: string[];
  userContext: {
    name: string;
    email: string;
    plan: string;
  };
}

export function CustomerIntelligenceHub({
  sentimentScore,
  summary,
  tags,
  userContext,
}: IntelligenceHubProps) {
  // Determine sentiment color
  const sentimentColor =
    sentimentScore > 75
      ? "text-green-400 border-green-500/50"
      : sentimentScore > 40
        ? "text-amber-400 border-amber-500/50"
        : "text-red-400 border-red-500/50";

  return (
    <div className="p-4 space-y-6">
      {/* 1. AI Score Gauge (Simplified as Ring for V1) */}
      <div className="flex flex-col items-center justify-center space-y-2 py-4">
        <div
          className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 ${sentimentColor} bg-white/5`}
        >
          <div className="text-center">
            <span className="text-4xl font-bold">{sentimentScore}</span>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              AI Score
            </p>
          </div>
        </div>
      </div>

      {/* 2. Auto-Summary */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-primary">
            <BrainCircuit className="w-4 h-4" />
            <CardTitle className="text-sm font-semibold">
              Live Analysis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border-primary/30 text-primary-foreground/80 bg-primary/10"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. User Context */}
      <Card className="bg-transparent border-white/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <CardTitle className="text-sm font-semibold">Context</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-muted-foreground">Name</span>
            <span>{userContext.name}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-muted-foreground">Email</span>
            <span className="truncate max-w-[150px]">{userContext.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <Badge variant="secondary" className="bg-white/10">
              {userContext.plan}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
