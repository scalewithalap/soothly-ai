"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCw,
  XCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * CampaignCanvas - Center Pane for Superagent
 * Visual workflow of the multi-agent campaign.
 */

export interface CampaignStep {
  id: string;
  agentType: string;
  action: string;
  status: "pending" | "running" | "completed" | "failed";
  dependsOn: string[];
  params?: Record<string, any>;
  result?: any;
  startedAt?: string;
  completedAt?: string;
}

interface CampaignCanvasProps {
  campaignId?: string;
  steps: CampaignStep[];
  status: "planning" | "executing" | "completed" | "cancelled" | "failed";
  onRun: () => void;
  onPause: () => void;
  onCancel: () => void;
}

export function CampaignCanvas({
  campaignId,
  steps,
  status,
  onRun,
  onPause,
  onCancel,
}: CampaignCanvasProps) {
  if (!campaignId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-[#0F0F10]">
        <Bot className="w-12 h-12 opacity-20" />
        <p>Select a campaign to view workflow</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0F0F10] border-r border-white/10 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />

      {/* Header / Control Bar */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/40 backdrop-blur-sm z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">
            Campaign Workflow
          </h1>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "border-white/10",
                status === "executing"
                  ? "bg-blue-500/10 text-blue-400"
                  : status === "completed"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-gray-400",
              )}
            >
              {status.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-500">{steps.length} Steps</span>
          </div>
        </div>

        <div className="flex gap-2">
          {status === "executing" ? (
            <Button
              variant="secondary"
              onClick={onPause}
              className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
            >
              <Pause className="w-4 h-4 mr-2" /> Pause
            </Button>
          ) : status === "completed" ? (
            <Button variant="outline" className="border-white/10">
              <RotateCw className="w-4 h-4 mr-2" /> Rerun
            </Button>
          ) : (
            <Button
              onClick={onRun}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Play className="w-4 h-4 mr-2" /> Execute
            </Button>
          )}

          {(status === "planning" || status === "executing") && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Visualization */}
      <ScrollArea className="flex-1 z-0">
        <div className="p-12 min-h-full flex flex-col items-center justify-start gap-8">
          {/* Start Node */}
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500 font-mono">
            START
          </div>
          <div className="h-8 w-px bg-white/10" />

          {/* Steps */}
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              {/* Step Card */}
              <div
                className={cn(
                  "w-80 p-4 rounded-xl border backdrop-blur-md transition-all",
                  step.status === "running"
                    ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]"
                    : step.status === "completed"
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : step.status === "failed"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-black/40 border-white/10",
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge
                    variant="secondary"
                    className="bg-white/5 text-gray-400 border-white/5 text-[10px]"
                  >
                    {step.agentType.toUpperCase()}
                  </Badge>
                  {getStepIcon(step.status)}
                </div>

                <h3 className="font-semibold text-gray-200 mb-1 flex items-center gap-2">
                  {step.action}
                </h3>

                {step.params && (
                  <div className="text-xs text-gray-500 font-mono bg-black/30 p-2 rounded mt-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {JSON.stringify(step.params).replace(/[{}]/g, "")}
                  </div>
                )}

                {step.status === "completed" && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-[10px] text-purple-400"
                    >
                      View Output <ExternalLink className="ml-1 w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Connector Line (if not last) */}
              {index < steps.length - 1 && (
                <div className="h-8 w-px bg-white/10 my-2" />
              )}
            </div>
          ))}

          {/* End Node */}
          <div className="h-8 w-px bg-white/10" />
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500 font-mono">
            END
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function getStepIcon(status: CampaignStep["status"]) {
  switch (status) {
    case "running":
      return <RotateCw className="w-4 h-4 text-purple-400 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600" />;
  }
}
