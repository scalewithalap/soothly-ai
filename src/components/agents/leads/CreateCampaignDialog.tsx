"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useContent } from "@/hooks/use-content";

const campaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  industry: z.string().optional(),
  job_title: z.string().optional(),
  location: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCampaignDialogProps) {
  const { content } = useContent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      industry: "",
      job_title: "",
      location: "",
    },
  });

  const onSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agents/leads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          target_criteria: {
            industry: data.industry,
            job_title: data.job_title,
            location: data.location,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create campaign");
      }

      toast.success("Campaign created! Background processing started.");
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create campaign"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-host">
            {content.agentUI.leadGen.createCampaign}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Define your target audience to start generating leads
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    {content.agentUI.leadGen.campaignName}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Q1 SaaS Outreach"
                      className="bg-black/20 border-white/10 focus:border-cyan-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-sm font-medium text-gray-300">
                {content.agentUI.leadGen.targetCriteria}
              </h4>

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-400 text-xs">
                      Industry
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., SaaS, FinTech"
                        className="bg-black/20 border-white/10 focus:border-cyan-500/50"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-400 text-xs">
                      Job Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., CEO, Head of Marketing"
                        className="bg-black/20 border-white/10 focus:border-cyan-500/50"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-400 text-xs">
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., United States, Europe"
                        className="bg-black/20 border-white/10 focus:border-cyan-500/50"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-white/10 text-gray-300 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {isSubmitting
                  ? "Creating..."
                  : content.agentUI.leadGen.createCampaign}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
