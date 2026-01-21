"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel, ApprovalStatus } from "@/agents/hitl/types";

/**
 * ApprovalCard Component
 *
 * Per frontend-design/SKILL.md §2 "AI Intervention (Human-in-the-Loop)":
 * - Glass panel with Amber glow for pending
 * - Green for approved, Red for rejected
 * - Clarity > Aesthetics. Buttons must be explicitly "Approve" (Green) or "Reject" (Red)
 */

interface ApprovalCardProps {
  /** Unique identifier for the approval request */
  id: string;
  /** Title of the action requiring approval */
  title: string;
  /** Agent that triggered this request */
  agentType: string;
  /** Action being requested */
  action: string;
  /** Optional description */
  description?: string;
  /** Risk level affects visual styling */
  riskLevel: RiskLevel;
  /** Current approval status */
  status: ApprovalStatus;
  /** Preview data to display */
  previewData?: Record<string, unknown>;
  /** Time until expiration */
  expiresAt?: string;
  /** Callback when approved */
  onApprove?: (id: string) => Promise<void>;
  /** Callback when rejected with optional comment */
  onReject?: (id: string, comment?: string) => Promise<void>;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Compact mode for inline use */
  compact?: boolean;
}

// Styling per SKILL.md
const statusStyles = {
  pending: "border-amber-500/50 animate-pulse bg-white/5",
  approved: "border-green-500/50 bg-white/5",
  rejected: "border-red-500/50 bg-white/5",
  expired: "border-gray-500/50 bg-white/5 opacity-60",
  auto_approved: "border-green-500/50 bg-white/5",
  auto_rejected: "border-red-500/50 bg-white/5 opacity-60",
} as const;

const riskStyles = {
  low: { badge: "text-green-400 border-green-500/50", label: "Low Risk" },
  medium: { badge: "text-amber-400 border-amber-500/50", label: "Medium Risk" },
  high: { badge: "text-orange-400 border-orange-500/50", label: "High Risk" },
  critical: { badge: "text-red-400 border-red-500/50", label: "Critical" },
} as const;

export function ApprovalCard({
  id,
  title,
  agentType,
  action,
  description,
  riskLevel,
  status,
  previewData,
  expiresAt,
  onApprove,
  onReject,
  disabled = false,
  compact = false,
}: ApprovalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!onApprove || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      await onApprove(id);
    } catch {
      setError("Failed to approve");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      await onReject(id);
    } catch {
      setError("Failed to reject");
    } finally {
      setIsProcessing(false);
    }
  };

  const isPending = status === "pending";
  const risk = riskStyles[riskLevel] || riskStyles.low;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border backdrop-blur-xl",
          statusStyles[status] || statusStyles.pending,
        )}
      >
        <div className="flex items-center gap-3">
          {isPending && (
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          )}
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="outline" className={risk.badge}>
            {risk.label}
          </Badge>
        </div>
        {isPending && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-red-400 border-red-500/50 hover:bg-red-500/10"
              onClick={handleReject}
              disabled={disabled || isProcessing}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-7 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={disabled || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Approve
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "border backdrop-blur-xl transition-all duration-300",
        statusStyles[status] || statusStyles.pending,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold leading-none">
              {title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {agentType.toUpperCase()} • {action}
            </p>
          </div>
          <Badge variant="outline" className={risk.badge}>
            {riskLevel === "high" || riskLevel === "critical" ? (
              <AlertTriangle className="w-3 h-3 mr-1" />
            ) : null}
            {risk.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}

        {previewData && (
          <div className="p-2 bg-black/30 rounded text-xs font-mono overflow-hidden border border-white/10">
            <pre className="text-primary-foreground/70">
              {JSON.stringify(previewData, null, 2).slice(0, 200)}
              {JSON.stringify(previewData).length > 200 && "..."}
            </pre>
          </div>
        )}

        {expiresAt && isPending && (
          <div className="flex items-center gap-1 mt-3 text-amber-400 text-xs">
            <Clock className="w-3 h-3" />
            Expires: {new Date(expiresAt).toLocaleString()}
          </div>
        )}

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </CardContent>

      <CardFooter className="pt-3 border-t border-white/10 bg-white/5">
        {isPending ? (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleReject}
              disabled={disabled || isProcessing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={disabled || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        ) : (
          <div className="w-full text-center text-sm text-muted-foreground">
            {status === "approved" && (
              <span className="text-green-400">✓ Approved</span>
            )}
            {status === "rejected" && (
              <span className="text-red-400">✗ Rejected</span>
            )}
            {status === "expired" && (
              <span className="text-gray-400">⏱ Expired</span>
            )}
            {status === "auto_approved" && (
              <span className="text-green-400">✓ Auto-Approved</span>
            )}
            {status === "auto_rejected" && (
              <span className="text-red-400">✗ Auto-Rejected</span>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
