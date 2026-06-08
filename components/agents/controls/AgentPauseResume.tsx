"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * AgentPauseResume Component
 *
 * Per frontend-design/SKILL.md §2 "Intervention & Control (HITL)":
 * - Pause/Resume: Users must be able to "Pause" an active agent
 */

interface AgentPauseResumeProps {
  /** Agent run ID to control */
  agentRunId: string;
  /** Current run status */
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  /** Agent type for display */
  agentType?: string;
  /** Callback after pause/resume */
  onStatusChange?: (newStatus: "running" | "paused" | "cancelled") => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show cancel button */
  showCancel?: boolean;
  /** Additional className */
  className?: string;
}

const sizeStyles = {
  sm: { button: "h-7 px-2 text-xs", icon: "w-3 h-3" },
  md: { button: "h-9 px-3 text-sm", icon: "w-4 h-4" },
  lg: { button: "h-11 px-4 text-base", icon: "w-5 h-5" },
} as const;

export function AgentPauseResume({
  agentRunId,
  status,
  agentType,
  onStatusChange,
  size = "md",
  showCancel = false,
  className,
}: AgentPauseResumeProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<
    "pause" | "resume" | "cancel" | null
  >(null);

  const sizing = sizeStyles[size];
  const isActive = status === "running" || status === "paused";

  const handlePause = async () => {
    if (isProcessing || status !== "running") return;

    setIsProcessing(true);
    setProcessingAction("pause");

    try {
      const res = await fetch(`/api/agents/${agentRunId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.userMessage || "Failed to pause agent");
      }

      toast.success("Agent paused");
      onStatusChange?.("paused");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to pause agent";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleResume = async () => {
    if (isProcessing || status !== "paused") return;

    setIsProcessing(true);
    setProcessingAction("resume");

    try {
      const res = await fetch(`/api/agents/${agentRunId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.userMessage || "Failed to resume agent");
      }

      toast.success("Agent resumed");
      onStatusChange?.("running");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resume agent";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleCancel = async () => {
    if (isProcessing || !isActive) return;

    setIsProcessing(true);
    setProcessingAction("cancel");

    try {
      const res = await fetch(`/api/agents/${agentRunId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.userMessage || "Failed to cancel agent");
      }

      toast.success("Agent cancelled");
      onStatusChange?.("cancelled");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel agent";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  if (!isActive) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        {status === "completed" && (
          <span className="text-green-400">✓ Completed</span>
        )}
        {status === "failed" && <span className="text-red-400">✗ Failed</span>}
        {status === "cancelled" && (
          <span className="text-gray-400">⏹ Cancelled</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {agentType && (
        <span className="text-xs text-muted-foreground uppercase">
          {agentType}
        </span>
      )}

      {status === "running" ? (
        <Button
          variant="outline"
          className={cn(
            sizing.button,
            "border-amber-500/50 text-amber-400 hover:bg-amber-500/10",
          )}
          onClick={handlePause}
          disabled={isProcessing}
        >
          {processingAction === "pause" ? (
            <Loader2 className={cn(sizing.icon, "animate-spin")} />
          ) : (
            <Pause className={sizing.icon} />
          )}
          <span className="ml-1.5">Pause</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          className={cn(
            sizing.button,
            "border-green-500/50 text-green-400 hover:bg-green-500/10",
          )}
          onClick={handleResume}
          disabled={isProcessing}
        >
          {processingAction === "resume" ? (
            <Loader2 className={cn(sizing.icon, "animate-spin")} />
          ) : (
            <Play className={sizing.icon} />
          )}
          <span className="ml-1.5">Resume</span>
        </Button>
      )}

      {showCancel && (
        <Button
          variant="outline"
          className={cn(
            sizing.button,
            "border-red-500/50 text-red-400 hover:bg-red-500/10",
          )}
          onClick={handleCancel}
          disabled={isProcessing}
        >
          {processingAction === "cancel" ? (
            <Loader2 className={cn(sizing.icon, "animate-spin")} />
          ) : (
            <Square className={sizing.icon} />
          )}
          <span className="ml-1.5">Cancel</span>
        </Button>
      )}
    </div>
  );
}
