"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceScore } from "../indicators/ConfidenceScore";

/**
 * ClarificationModal Component
 *
 * Per frontend-design/SKILL.md §2 "Intervention & Control (HITL)":
 * - Feedback Loop: If agent confidence < 70%, MUST ask user for clarification via Modal
 */

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
}

interface ClarificationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal state changes */
  onOpenChange: (open: boolean) => void;
  /** Agent type requesting clarification */
  agentType: string;
  /** Current action/step that needs clarification */
  action: string;
  /** Question or clarification prompt */
  prompt: string;
  /** Current confidence score (triggers when < 0.7) */
  confidence: number;
  /** Optional context about the ambiguity */
  context?: string;
  /** Predefined options to choose from */
  options?: ClarificationOption[];
  /** Whether to allow freeform text input */
  allowFreeform?: boolean;
  /** Callback when user provides clarification */
  onSubmit: (response: {
    selectedOption?: string;
    freeformText?: string;
    action: "continue" | "abort" | "retry";
  }) => Promise<void>;
  /** Additional className */
  className?: string;
}

export function ClarificationModal({
  isOpen,
  onOpenChange,
  agentType,
  action,
  prompt,
  confidence,
  context,
  options = [],
  allowFreeform = true,
  onSubmit,
  className,
}: ClarificationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [freeformText, setFreeformText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (submitAction: "continue" | "abort" | "retry") => {
    if (isSubmitting) return;

    // Validate that user provided input
    if (
      submitAction === "continue" &&
      !selectedOption &&
      !freeformText.trim()
    ) {
      setError("Please provide clarification before continuing");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        selectedOption: selectedOption || undefined,
        freeformText: freeformText.trim() || undefined,
        action: submitAction,
      });

      // Reset state on success
      setSelectedOption("");
      setFreeformText("");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit clarification",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedOption("");
    setFreeformText("");
    setError(null);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-[500px] bg-black/90 backdrop-blur-xl border-amber-500/30",
          className,
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-500/20 border border-amber-500/50">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Clarification Needed
              </DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-wide">
                {agentType} • {action}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confidence indicator */}
          <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Low confidence detected</span>
            </div>
            <ConfidenceScore score={confidence} size="sm" />
          </div>

          {/* Main prompt */}
          <div className="space-y-2">
            <p className="text-sm text-primary-foreground">{prompt}</p>
            {context && (
              <p className="text-xs text-muted-foreground bg-white/5 p-2 rounded border border-white/10">
                {context}
              </p>
            )}
          </div>

          {/* Predefined options */}
          {options.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Select an option:
              </Label>
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Choose an option..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <div>
                        <span>{opt.label}</span>
                        {opt.description && (
                          <span className="text-xs text-muted-foreground ml-2">
                            - {opt.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Freeform input */}
          {allowFreeform && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {options.length > 0
                  ? "Or provide additional details:"
                  : "Your response:"}
              </Label>
              <Textarea
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                placeholder="Type your clarification here..."
                className="bg-white/5 border-white/10 resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => handleSubmit("abort")}
            disabled={isSubmitting}
            className="text-red-400 hover:bg-red-500/10"
          >
            Abort Task
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => handleSubmit("retry")}
            disabled={isSubmitting}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            Let AI Retry
          </Button>
          <Button
            onClick={() => handleSubmit("continue")}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Continue with Clarification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
