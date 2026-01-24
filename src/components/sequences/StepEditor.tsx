"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Trash2, Clock } from "lucide-react";
import { SequenceStep } from "@/lib/sequences/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Local form schema with required fields for form state
const StepFormSchema = z.object({
  stepOrder: z.number().int().positive(),
  delayDays: z.number().int().min(0),
  delayHours: z.number().int().min(0).max(23),
  subject: z.string().min(1, "Subject is required").max(500),
  bodyHtml: z.string().min(1, "Email body is required"),
  bodyText: z.string().optional(),
});

type StepFormValues = z.infer<typeof StepFormSchema>;

interface StepEditorProps {
  step?: SequenceStep;
  sequenceId: string;
  onSave: (step: StepFormValues & { id?: string }) => Promise<void>;
  onDelete?: (stepId: string) => Promise<void>;
  isSaving?: boolean;
}

const AVAILABLE_VARIABLES = [
  { name: "{{firstName}}", description: "Contact's first name" },
  { name: "{{lastName}}", description: "Contact's last name" },
  { name: "{{company}}", description: "Company name" },
  { name: "{{title}}", description: "Job title" },
];

export function StepEditor({
  step,
  onSave,
  onDelete,
  isSaving = false,
}: StepEditorProps) {
  const form = useForm<StepFormValues>({
    resolver: zodResolver(StepFormSchema),
    defaultValues: {
      stepOrder: step?.stepOrder ?? 1,
      delayDays: step?.delayDays ?? 1,
      delayHours: step?.delayHours ?? 0,
      subject: step?.subject ?? "",
      bodyHtml: step?.bodyHtml ?? "",
      bodyText: step?.bodyText ?? "",
    },
  });

  const delayDays = form.watch("delayDays");
  const delayHours = form.watch("delayHours");

  // Reset form when step changes
  useEffect(() => {
    if (step) {
      form.reset({
        stepOrder: step.stepOrder,
        delayDays: step.delayDays,
        delayHours: step.delayHours,
        subject: step.subject,
        bodyHtml: step.bodyHtml,
        bodyText: step.bodyText ?? "",
      });
    }
  }, [step, form]);

  const insertVariable = (variable: string) => {
    const activeElement = document.activeElement as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if (
      activeElement &&
      (activeElement.name === "subject" || activeElement.name === "bodyHtml")
    ) {
      const start = activeElement.selectionStart ?? 0;
      const end = activeElement.selectionEnd ?? 0;
      const currentValue = activeElement.value;
      const newValue =
        currentValue.substring(0, start) +
        variable +
        currentValue.substring(end);

      // Update form state directly
      form.setValue(activeElement.name as "subject" | "bodyHtml", newValue, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const onSubmit = async (data: StepFormValues) => {
    await onSave({ ...data, id: step?.id });
  };

  return (
    <GlassCard className="w-full">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            {step ? `Edit Step ${step.stepOrder}` : "New Email Step"}
          </h3>
          {step && (
            <Badge variant="outline" className="text-xs">
              ID: {step.id.slice(0, 8)}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {step && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => onDelete(step.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Scheduling Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="col-span-2 flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span>Delay Setting</span>
              </div>
              <FormField
                control={form.control}
                name="delayDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wait Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="delayHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wait Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-2 text-xs text-muted-foreground">
                Step will run {delayDays} days and {delayHours} hours after the
                previous step.
              </div>
            </div>

            {/* Email Content Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                <span className="text-xs text-muted-foreground mr-2">
                  Variables:
                </span>
                {AVAILABLE_VARIABLES.map((v) => (
                  <TooltipProvider key={v.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-white/5 border-white/10"
                          onClick={() => insertVariable(v.name)}
                        >
                          {v.name}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{v.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email subject..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bodyHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hi {{firstName}}, ..."
                        className="min-h-[300px] font-mono text-sm leading-relaxed"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Supports HTML. Use variables like {"{{firstName}}"} for
                      personalization.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Step
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </GlassCard>
  );
}
