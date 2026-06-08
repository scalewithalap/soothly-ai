"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Newspaper,
  Users,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProspectIntelligence - Right Pane for Lead Gen Agent
 * Displays buying signals, company news, and verification status.
 */

interface ProspectIntelligenceProps {
  companyName?: string;
  signals?: Array<{ type: string; score: number; description: string }>;
  news?: Array<{ title: string; date: string; source: string }>;
  similarCompanies?: Array<{ name: string; match: number }>;
}

export function ProspectIntelligence({
  companyName = "Acme Corp",
  signals = [],
  news = [],
  similarCompanies = [],
}: ProspectIntelligenceProps) {
  // Mock data if empty
  const activeSignals =
    signals.length > 0
      ? signals
      : [
          {
            type: "Hiring",
            score: 85,
            description: "Hiring for 5+ Engineering roles",
          },
          {
            type: "Funding",
            score: 92,
            description: "Raised Series B ($30M) last month",
          },
          {
            type: "Tech",
            score: 60,
            description: "Recently added Next.js to stack",
          },
        ];

  const activeNews =
    news.length > 0
      ? news
      : [
          {
            title: "Acme Corp announces new AI initiative",
            date: "2d ago",
            source: "TechCrunch",
          },
          {
            title: "VP of Engineering speaks at QCon",
            date: "1w ago",
            source: "Company Blog",
          },
        ];

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Intelligence Hub
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Buying Signals */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Buying Signals
            </h3>
            <div className="space-y-2">
              {activeSignals.map((signal, i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-lg p-3 border border-white/5"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm text-gray-200">
                      {signal.type}
                    </span>
                    <ScoreBar score={signal.score} />
                  </div>
                  <p className="text-xs text-gray-400 leading-snug">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <Separator className="bg-white/10" />

          {/* Verification Status */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Verification
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-300">Email Valid</span>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-300">LinkedIn Active</span>
              </div>
            </div>
          </section>

          <Separator className="bg-white/10" />

          {/* Recent News */}
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Newspaper className="w-3.5 h-3.5" /> Recent News
            </h3>
            <div className="space-y-3">
              {activeNews.map((item, i) => (
                <a key={i} href="#" className="block group">
                  <h4 className="text-sm text-gray-300 group-hover:text-primary transition-colors leading-snug mb-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  let color = "bg-gray-500";
  if (score >= 80) color = "bg-emerald-500";
  else if (score >= 50) color = "bg-amber-500";
  else color = "bg-red-500";

  return (
    <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
