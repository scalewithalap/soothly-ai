"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Use number() directly instead of coerce to be stricter about types if needed,
// but usually coerce is fine. The error might be due to react-hook-form inference.
// I'll try without coerce first since Input type="number" returns a string in HTML but React Hook Form should handle it.
// Actually, RHF with HTML inputs returns strings. zod.number() expects number.
// So coerce IS needed.
// The error "Type 'unknown' is not assignable to type 'number'" suggests that Zod might be inferring something else.
// I will try to rebuild the file content to ensure clean typing.

const briefSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  primaryKeyword: z.string().min(2, "Keyword required"),
  wordCount: z.number().min(500),
});

type BriefFormValues = z.infer<typeof briefSchema>;

interface CreateBriefDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBriefDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateBriefDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MOCK DICTIONARY
  const dict = {
    agentUI: {
      content: {
        createBrief: "Create Brief",
        topic: "Topic / Title",
        generate: "Generate Article",
      },
    },
    loadingStates: {
      processing: "Creating brief...",
    },
  };

  const form = useForm<BriefFormValues>({
    resolver: zodResolver(briefSchema),
    defaultValues: {
      title: "",
      primaryKeyword: "",
      wordCount: 1500,
    },
  });

  const onSubmit = async (data: BriefFormValues) => {
    setIsSubmitting(true);
    try {
      // TODO: Call API
      console.log("Creating brief:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Content brief created");
      form.reset();
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to create brief");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={dict.agentUI.content.createBrief}
      description="Plan a new SEO-optimized article."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            {dict.agentUI.content.topic}
          </label>
          <Input
            {...form.register("title")}
            placeholder="e.g. The Future of AI Agents"
            className="bg-gray-800 border-gray-700"
            disabled={isSubmitting}
          />
          {form.formState.errors.title?.message && (
            <p className="text-xs text-red-400">
              {String(form.formState.errors.title.message)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Primary Keyword
            </label>
            <Input
              {...form.register("primaryKeyword")}
              placeholder="e.g. ai agents"
              className="bg-gray-800 border-gray-700"
              disabled={isSubmitting}
            />
            {form.formState.errors.primaryKeyword?.message && (
              <p className="text-xs text-red-400">
                {String(form.formState.errors.primaryKeyword.message)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Target Word Count
            </label>
            <Input
              type="number"
              {...form.register("wordCount", { valueAsNumber: true })}
              className="bg-gray-800 border-gray-700"
              disabled={isSubmitting}
            />
            {form.formState.errors.wordCount?.message && (
              <p className="text-xs text-red-400">
                {String(form.formState.errors.wordCount.message)}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-gray-700 text-gray-300 hover:text-white"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isSubmitting
              ? dict.loadingStates.processing
              : dict.agentUI.content.createBrief}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
