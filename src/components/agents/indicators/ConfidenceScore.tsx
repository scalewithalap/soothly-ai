"use client";

import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";

/**
 * ConfidenceScore Component
 *
 * Per frontend-design/SKILL.md §2 "Intervention & Control (HITL)":
 * - Display visible "Confidence Score" for critical actions
 * - If agent confidence < 70%, MUST trigger clarification
 *
 * Styling thresholds:
 * - >= 80%: Green (high confidence)
 * - 70-79%: Amber (medium confidence)
 * - < 70%: Red (low confidence, triggers clarification)
 */

interface ConfidenceScoreProps {
  /** Confidence score as decimal (0.0-1.0) or percentage (0-100) */
  score: number;
  /** Label to display */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the percentage text */
  showPercentage?: boolean;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Callback when score is below threshold (70%) */
  onLowConfidence?: (score: number) => void;
  /** Custom threshold for low confidence (default: 0.7) */
  lowThreshold?: number;
  /** Additional className */
  className?: string;
}

// Convert score to percentage if needed
const toPercentage = (score: number): number => {
  if (score <= 1) return Math.round(score * 100);
  return Math.round(score);
};

// Confidence level styles per SKILL.md
const confidenceStyles = {
  high: {
    text: "text-green-400",
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    glow: "shadow-green-500/20",
  },
  medium: {
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    glow: "shadow-amber-500/20",
  },
  low: {
    text: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    glow: "shadow-red-500/20",
  },
} as const;

const sizeStyles = {
  sm: { wrapper: "gap-1", text: "text-xs", icon: "w-3 h-3" },
  md: { wrapper: "gap-1.5", text: "text-sm", icon: "w-4 h-4" },
  lg: { wrapper: "gap-2", text: "text-base", icon: "w-5 h-5" },
} as const;

export function ConfidenceScore({
  score,
  label,
  size = "md",
  showPercentage = true,
  showIcon = true,
  onLowConfidence,
  lowThreshold = 0.7,
  className,
}: ConfidenceScoreProps) {
  const percentage = toPercentage(score);
  const normalizedScore = score <= 1 ? score : score / 100;

  // Determine confidence level
  const level =
    normalizedScore >= 0.8 ? "high" : normalizedScore >= 0.7 ? "medium" : "low";
  const styles = confidenceStyles[level];
  const sizing = sizeStyles[size];

  // Trigger low confidence callback if applicable
  if (normalizedScore < lowThreshold && onLowConfidence) {
    // Use setTimeout to avoid calling during render
    setTimeout(() => onLowConfidence(normalizedScore), 0);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-md border backdrop-blur-sm",
        styles.bg,
        styles.border,
        `shadow-sm ${styles.glow}`,
        sizing.wrapper,
        className,
      )}
      title={`Confidence: ${percentage}%`}
    >
      {showIcon && <Gauge className={cn(sizing.icon, styles.text)} />}
      {label && (
        <span className={cn(sizing.text, "text-muted-foreground")}>
          {label}:
        </span>
      )}
      {showPercentage && (
        <span className={cn(sizing.text, "font-semibold", styles.text)}>
          {percentage}%
        </span>
      )}
    </div>
  );
}

/**
 * ConfidenceBar - Visual bar representation of confidence
 */
interface ConfidenceBarProps {
  score: number;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceBar({
  score,
  height = 4,
  showLabel = false,
  className,
}: ConfidenceBarProps) {
  const percentage = toPercentage(score);
  const normalizedScore = score <= 1 ? score : score / 100;
  const level =
    normalizedScore >= 0.8 ? "high" : normalizedScore >= 0.7 ? "medium" : "low";

  const barColors = {
    high: "bg-green-500",
    medium: "bg-amber-500",
    low: "bg-red-500",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Confidence</span>
          <span className={confidenceStyles[level].text}>{percentage}%</span>
        </div>
      )}
      <div
        className="w-full bg-white/10 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={cn("h-full transition-all duration-500", barColors[level])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
