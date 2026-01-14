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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContent } from "@/hooks/use-content";

const briefSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  primary_keyword: z.string().min(2, "Keyword is required"),
  content_type: z.enum(["blog_post", "landing_page", "pillar_content"]),
  target_word_count: z.number().min(500),
});

type BriefFormData = z.infer<typeof briefSchema>;

interface CreateBriefDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateBriefDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateBriefDialogProps) {
  const { content } = useContent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BriefFormData>({
    resolver: zodResolver(briefSchema),
    defaultValues: {
      title: "",
      primary_keyword: "",
      content_type: "blog_post",
      target_word_count: 1500,
    },
  });

  const onSubmit = async (data: BriefFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agents/content/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create brief");
      }

      toast.success("Brief created! AI is now processing your content.");
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create brief"
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
            {content.agentUI.content.createBrief}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Define your content requirements for AI generation
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Article Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 10 Ways to Improve SEO"
                      className="bg-black/20 border-white/10 focus:border-purple-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primary_keyword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    {content.agentUI.content.topic}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., SEO best practices"
                      className="bg-black/20 border-white/10 focus:border-purple-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    {content.agentUI.content.contentType}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="blog_post">Blog Post</SelectItem>
                      <SelectItem value="landing_page">Landing Page</SelectItem>
                      <SelectItem value="pillar_content">
                        Pillar Content
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_word_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    {content.agentUI.content.wordCount}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="bg-black/20 border-white/10 focus:border-purple-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isSubmitting
                  ? "Creating..."
                  : content.agentUI.content.createBrief}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
