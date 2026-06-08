"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Target, Sparkles, PlayCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * StrategyConsole - Right Pane for Superagent
 * Configuration and inputs for campaigns.
 */

const TEMPLATES = [
  {
    id: "niche_takeover",
    name: "Niche Takeover",
    desc: "Competitor Analysis → SEO → Outreach",
  },
  {
    id: "content_blitz",
    name: "Content Blitz",
    desc: "Rapidly generate topical content",
  },
  {
    id: "outbound",
    name: "Outbound Sales",
    desc: "Find leads and enrich data",
  },
  { id: "custom", name: "Custom Strategy", desc: "Let AI design the workflow" },
];

interface StrategyConsoleProps {
  onPlanCreated?: () => void;
}

export function StrategyConsole({ onPlanCreated }: StrategyConsoleProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("niche_takeover");
  const [objective, setObjective] = useState("");
  const [targetNiche, setTargetNiche] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleGeneratePlan = async () => {
    if (!objective.trim()) {
      toast.error("Please enter an objective");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/agents/superagent/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedTemplate,
          objective,
          inputs: {
            targetNiche,
            competitorUrl,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to create campaign");

      toast.success("Campaign planning started!");
      setObjective("");
      setTargetNiche("");
      setCompetitorUrl("");

      // Refresh campaign list
      if (onPlanCreated) {
        setTimeout(onPlanCreated, 1500);
      }
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          Strategy Console
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Template Selection */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-medium">
              <Target className="w-3.5 h-3.5" /> Campaign Type
            </div>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all",
                    selectedTemplate === t.id
                      ? "bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500/30"
                      : "bg-white/5 border-white/5 hover:bg-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "font-medium text-sm mb-0.5",
                      selectedTemplate === t.id
                        ? "text-purple-300"
                        : "text-gray-300",
                    )}
                  >
                    {t.name}
                  </div>
                  <div className="text-xs text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </section>

          <Separator className="bg-white/10" />

          {/* Configuration */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-medium">
              <Sparkles className="w-3.5 h-3.5" /> Configuration
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Target Objective
                </label>
                <Textarea
                  placeholder="e.g. Become the #1 authority on AI Legal Tools"
                  className="bg-white/5 border-white/10 text-sm h-20"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Target Niche / Topic
                </label>
                <Input
                  placeholder="e.g. Legal Tech"
                  className="bg-white/5 border-white/10"
                  value={targetNiche}
                  onChange={(e) => setTargetNiche(e.target.value)}
                />
              </div>

              {selectedTemplate === "niche_takeover" && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">
                    Competitor URL
                  </label>
                  <Input
                    placeholder="https://competitor.com"
                    className="bg-white/5 border-white/10"
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>

          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 h-10"
            onClick={handleGeneratePlan}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            {isCreating ? "Planning..." : "Generate Plan"}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
