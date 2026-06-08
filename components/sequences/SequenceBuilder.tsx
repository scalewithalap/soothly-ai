"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mail, Loader2 } from "lucide-react";
import { SequenceWithSteps, CreateStepInput } from "@/lib/sequences/types";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { toast } from "sonner";
import { StepEditor } from "./StepEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SequenceBuilderProps {
  sequenceId: string;
}

export function SequenceBuilder({ sequenceId }: SequenceBuilderProps) {
  const router = useRouter();
  const [sequence, setSequence] = useState<SequenceWithSteps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch sequence data
  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequenceId}`);
      const data = await res.json();
      if (data.success) {
        setSequence(data.data);
        // Select first step by default if available and none selected
        if (data.data.steps.length > 0 && !selectedStepId) {
          setSelectedStepId(data.data.steps[0].id);
        }
      } else {
        throw new Error(data.error?.message || "Failed to load");
      }
    } catch (_error) {
      console.error("Failed to fetch sequence:", _error);
      toast.error("Failed to load sequence details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSequence();
  }, [sequenceId]);

  const handleCreateStep = async () => {
    try {
      setIsSaving(true);
      const newStepOrder = (sequence?.steps.length || 0) + 1;

      const res = await fetch(`/api/sequences/${sequenceId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepOrder: newStepOrder,
          subject: "New Email Step",
          bodyHtml: "<p>Write your content here...</p>",
          delayDays: 2,
          delayHours: 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchSequence();
        setSelectedStepId(data.data.id);
        toast.success("Step created");
      }
    } catch (_error) {
      toast.error("Failed to create step");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep = async (
    stepData: CreateStepInput & { id?: string },
  ) => {
    if (!stepData.id) return;

    try {
      setIsSaving(true);

      const res = await fetch(
        `/api/sequences/${sequenceId}/steps/${stepData.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stepData),
        },
      );

      if (res.ok) {
        await fetchSequence();
        toast.success("Step updated successfully");
      } else {
        throw new Error("Failed to save");
      }
    } catch (_error) {
      toast.error("Failed to save step");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Are you sure you want to delete this step?")) return;

    try {
      const res = await fetch(`/api/sequences/${sequenceId}/steps/${stepId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchSequence();
        setSelectedStepId(null);
        toast.success("Step removed");
      }
    } catch (_error) {
      toast.error("Failed to delete step");
    }
  };

  const selectedStep = sequence?.steps.find((s) => s.id === selectedStepId);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Sidebar: Steps List */}
      <GlassCard className="w-80 flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <h3 className="font-semibold text-sm">Sequence Steps</h3>
          <Badge variant="secondary">{sequence?.steps.length || 0}</Badge>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {sequence?.steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={cn(
                  "group flex flex-col p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                  selectedStepId === step.id
                    ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20"
                    : "bg-white/5 border-white/10 hover:border-white/20",
                )}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {index === 0
                        ? "Start"
                        : `${step.delayDays}d ${step.delayHours}h`}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {step.subject || "(No subject)"}
                </p>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5"
              onClick={handleCreateStep}
              disabled={isSaving}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Step
            </Button>
          </div>
        </ScrollArea>
      </GlassCard>

      {/* Main Content: Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedStep ? (
          <StepEditor
            step={selectedStep}
            sequenceId={sequenceId}
            onSave={handleSaveStep}
            onDelete={handleDeleteStep}
            isSaving={isSaving}
          />
        ) : (
          <GlassCard className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-dashed">
            <Mail className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a step to edit or create a new one</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
