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
import { Sparkles } from "lucide-react";

// AI Models available for article generation
const AI_MODELS = [
  { value: "gemini-3-pro", label: "Gemini 3 Pro", provider: "Google" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash", provider: "Google" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { value: "gpt-5.2", label: "GPT-5.2", provider: "OpenAI" },
  { value: "gpt-5.0", label: "GPT-5.0", provider: "OpenAI" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI" },
  {
    value: "claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
  },
  {
    value: "claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
  },
  { value: "claude-opus-4.5", label: "Claude Opus 4.5", provider: "Anthropic" },
] as const;

const briefSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  primary_keyword: z.string().min(2, "Keyword is required"),
  content_type: z.enum(["blog_post", "landing_page", "pillar_content"]),
  target_word_count: z.number().min(500),
  ai_model: z.enum([
    "gemini-3-pro",
    "gemini-3-flash",
    "gemini-2.5-pro",
    "gpt-5.2",
    "gpt-5.0",
    "gpt-5-mini",
    "gpt-5-nano",
    "claude-haiku-4.5",
    "claude-sonnet-4.5",
    "claude-opus-4.5",
  ]),
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
  const contentUI = content.agentUI?.content || {};
  const dialog = contentUI.dialog || {};
  const labels = dialog.labels || {};
  const contentTypes = dialog.contentTypes || {};
  const placeholders = dialog.placeholders || {};
  const buttons = dialog.buttons || {};
  const toasts = dialog.toasts || {};

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BriefFormData>({
    resolver: zodResolver(briefSchema),
    defaultValues: {
      title: "",
      primary_keyword: "",
      content_type: "blog_post",
      target_word_count: 1500,
      ai_model: "gemini-3-flash",
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
        throw new Error(
          errorData.error || toasts.failed || "Failed to create brief",
        );
      }

      const modelLabel =
        AI_MODELS.find((m) => m.value === data.ai_model)?.label ||
        data.ai_model;
      toast.success(
        `${contentUI.createBrief || "Brief"} created! ${modelLabel} is now generating your content.`,
      );
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : toasts.failed || "Failed to create brief",
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
            {contentUI.createBrief || "Create Brief"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {dialog.description ||
              "Define your content requirements for AI generation"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    {labels.articleTitle || "Article Title"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        placeholders.title || "e.g., 10 Ways to Improve SEO"
                      }
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
                    {contentUI.topic || "Topic / Keyword"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        placeholders.keyword || "e.g., SEO best practices"
                      }
                      className="bg-black/20 border-white/10 focus:border-purple-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      {contentUI.contentType || "Content Type"}
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
                        <SelectItem value="blog_post">
                          {contentTypes.blogPost || "Blog Post"}
                        </SelectItem>
                        <SelectItem value="landing_page">
                          {contentTypes.landingPage || "Landing Page"}
                        </SelectItem>
                        <SelectItem value="pillar_content">
                          {contentTypes.pillarContent || "Pillar Content"}
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
                      {contentUI.wordCount || "Word Count"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        className="bg-black/20 border-white/10 focus:border-purple-500/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AI Model Selector */}
            <FormField
              control={form.control}
              name="ai_model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    {labels.aiModel || "AI Model"}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue
                          placeholder={
                            placeholders.selectModel || "Select AI Model"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {/* Google Models */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                        Google
                      </div>
                      {AI_MODELS.filter((m) => m.provider === "Google").map(
                        (model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              {model.label}
                            </span>
                          </SelectItem>
                        ),
                      )}

                      {/* OpenAI Models */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 mt-1">
                        OpenAI
                      </div>
                      {AI_MODELS.filter((m) => m.provider === "OpenAI").map(
                        (model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              {model.label}
                            </span>
                          </SelectItem>
                        ),
                      )}

                      {/* Anthropic Models */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 mt-1">
                        Anthropic
                      </div>
                      {AI_MODELS.filter((m) => m.provider === "Anthropic").map(
                        (model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-500" />
                              {model.label}
                            </span>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {dialog.modelHint ||
                      "Choose the AI model for article generation"}
                  </p>
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
                {buttons.cancel || "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isSubmitting
                  ? buttons.creating || "Creating..."
                  : contentUI.createBrief || "Create Brief"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

