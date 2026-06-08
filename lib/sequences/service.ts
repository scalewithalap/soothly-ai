/**
 * Email Sequence CRUD Service
 * Database operations for sequences and steps
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  type Sequence,
  type SequenceStep,
  type SequenceWithSteps,
  type CreateSequenceInput,
  type UpdateSequenceInput,
  type CreateStepInput,
  type UpdateStepInput,
  type ReorderStepsInput,
  type SequenceSettings,
  type SequenceStats,
  SequenceSettingsSchema,
  SequenceStatsSchema,
} from "./types";

type SequenceRow = Database["public"]["Tables"]["email_sequences"]["Row"];
type StepRow = Database["public"]["Tables"]["email_sequence_steps"]["Row"];

// ============================================================================
// Transform Functions (DB → App Types)
// ============================================================================

function transformSequence(row: SequenceRow): Sequence {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    status: row.status as Sequence["status"],
    fromName: row.from_name,
    fromEmail: row.from_email,
    replyToEmail: row.reply_to_email,
    settings: SequenceSettingsSchema.parse(row.settings ?? {}),
    stats: SequenceStatsSchema.parse(row.stats ?? {}),
    createdBy: row.created_by,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function transformStep(row: StepRow): SequenceStep {
  return {
    id: row.id,
    sequenceId: row.sequence_id,
    stepOrder: row.step_order,
    delayDays: row.delay_days,
    delayHours: row.delay_hours ?? 0,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    variables: row.variables ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

// ============================================================================
// Sequence CRUD
// ============================================================================

export async function listSequences(options?: {
  status?: Sequence["status"];
  limit?: number;
  offset?: number;
}): Promise<{ sequences: Sequence[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("email_sequences")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 10) - 1,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list sequences: ${error.message}`);
  }

  return {
    sequences: (data ?? []).map(transformSequence),
    total: count ?? 0,
  };
}

export async function getSequence(
  sequenceId: string,
): Promise<Sequence | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequences")
    .select("*")
    .eq("id", sequenceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to get sequence: ${error.message}`);
  }

  return transformSequence(data);
}

export async function getSequenceWithSteps(
  sequenceId: string,
): Promise<SequenceWithSteps | null> {
  const supabase = await createClient();

  const { data: sequenceData, error: sequenceError } = await supabase
    .from("email_sequences")
    .select("*")
    .eq("id", sequenceId)
    .single();

  if (sequenceError) {
    if (sequenceError.code === "PGRST116") return null;
    throw new Error(`Failed to get sequence: ${sequenceError.message}`);
  }

  const { data: stepsData, error: stepsError } = await supabase
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  if (stepsError) {
    throw new Error(`Failed to get sequence steps: ${stepsError.message}`);
  }

  return {
    ...transformSequence(sequenceData),
    steps: (stepsData ?? []).map(transformStep),
  };
}

export async function createSequence(
  input: CreateSequenceInput,
  userId?: string,
): Promise<Sequence> {
  const supabase = await createClient();

  // Get user's org_id
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .single();

  if (userError || !userData?.org_id) {
    throw new Error("Failed to determine organization");
  }

  const settings: SequenceSettings = SequenceSettingsSchema.parse(
    input.settings ?? {},
  );
  const stats: SequenceStats = SequenceStatsSchema.parse({});

  const { data, error } = await supabase
    .from("email_sequences")
    .insert({
      org_id: userData.org_id,
      name: input.name,
      description: input.description ?? null,
      from_name: input.fromName,
      from_email: input.fromEmail,
      reply_to_email: input.replyToEmail ?? null,
      settings:
        settings as unknown as Database["public"]["Tables"]["email_sequences"]["Insert"]["settings"],
      stats:
        stats as unknown as Database["public"]["Tables"]["email_sequences"]["Insert"]["stats"],
      created_by: userId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create sequence: ${error.message}`);
  }

  return transformSequence(data);
}

export async function updateSequence(
  sequenceId: string,
  input: UpdateSequenceInput,
): Promise<Sequence> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.fromName !== undefined) updateData.from_name = input.fromName;
  if (input.fromEmail !== undefined) updateData.from_email = input.fromEmail;
  if (input.replyToEmail !== undefined)
    updateData.reply_to_email = input.replyToEmail;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.settings !== undefined) {
    updateData.settings = SequenceSettingsSchema.parse(input.settings);
  }

  const { data, error } = await supabase
    .from("email_sequences")
    .update(updateData as any)
    .eq("id", sequenceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update sequence: ${error.message}`);
  }

  return transformSequence(data);
}

export async function deleteSequence(sequenceId: string): Promise<void> {
  const supabase = await createClient();

  // Soft delete by archiving
  const { error } = await supabase
    .from("email_sequences")
    .update({ status: "archived" })
    .eq("id", sequenceId);

  if (error) {
    throw new Error(`Failed to delete sequence: ${error.message}`);
  }
}

export async function updateSequenceStats(
  sequenceId: string,
  stats: Partial<SequenceStats>,
): Promise<void> {
  const supabase = await createClient();

  // Get current stats
  const { data: current, error: fetchError } = await supabase
    .from("email_sequences")
    .select("stats")
    .eq("id", sequenceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch sequence stats: ${fetchError.message}`);
  }

  const currentStats = SequenceStatsSchema.parse(current?.stats ?? {});
  const newStats = { ...currentStats, ...stats };

  // Calculate rates
  if (newStats.totalSent > 0) {
    newStats.openRate = Math.round(
      (newStats.totalOpened / newStats.totalSent) * 100,
    );
    newStats.replyRate = Math.round(
      (newStats.totalReplied / newStats.totalSent) * 100,
    );
  }

  const { error } = await supabase
    .from("email_sequences")
    .update({
      stats:
        newStats as unknown as Database["public"]["Tables"]["email_sequences"]["Update"]["stats"],
    })
    .eq("id", sequenceId);

  if (error) {
    throw new Error(`Failed to update sequence stats: ${error.message}`);
  }
}

// ============================================================================
// Step CRUD
// ============================================================================

export async function getSteps(sequenceId: string): Promise<SequenceStep[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to get steps: ${error.message}`);
  }

  return (data ?? []).map(transformStep);
}

export async function getStep(stepId: string): Promise<SequenceStep | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequence_steps")
    .select("*")
    .eq("id", stepId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get step: ${error.message}`);
  }

  return transformStep(data);
}

export async function createStep(
  sequenceId: string,
  input: CreateStepInput,
): Promise<SequenceStep> {
  const supabase = await createClient();

  // Extract variables from template
  const variables = extractVariables(input.bodyHtml);

  const { data, error } = await supabase
    .from("email_sequence_steps")
    .insert({
      sequence_id: sequenceId,
      step_order: input.stepOrder,
      delay_days: input.delayDays,
      delay_hours: input.delayHours ?? 0,
      subject: input.subject,
      body_html: input.bodyHtml,
      body_text: input.bodyText ?? null,
      variables,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create step: ${error.message}`);
  }

  return transformStep(data);
}

export async function updateStep(
  stepId: string,
  input: UpdateStepInput,
): Promise<SequenceStep> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (input.stepOrder !== undefined) updateData.step_order = input.stepOrder;
  if (input.delayDays !== undefined) updateData.delay_days = input.delayDays;
  if (input.delayHours !== undefined) updateData.delay_hours = input.delayHours;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.bodyHtml !== undefined) {
    updateData.body_html = input.bodyHtml;
    updateData.variables = extractVariables(input.bodyHtml);
  }
  if (input.bodyText !== undefined) updateData.body_text = input.bodyText;

  const { data, error } = await supabase
    .from("email_sequence_steps")
    .update(updateData as any)
    .eq("id", stepId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update step: ${error.message}`);
  }

  return transformStep(data);
}

export async function deleteStep(stepId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_sequence_steps")
    .delete()
    .eq("id", stepId);

  if (error) {
    throw new Error(`Failed to delete step: ${error.message}`);
  }
}

export async function reorderSteps(
  sequenceId: string,
  input: ReorderStepsInput,
): Promise<SequenceStep[]> {
  const supabase = await createClient();

  // Update each step's order
  for (const step of input.steps) {
    const { error } = await supabase
      .from("email_sequence_steps")
      .update({ step_order: step.stepOrder })
      .eq("id", step.id)
      .eq("sequence_id", sequenceId);

    if (error) {
      throw new Error(`Failed to reorder step ${step.id}: ${error.message}`);
    }
  }

  return getSteps(sequenceId);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Extract variable names from email template
 * Matches {{variableName}} patterns
 */
function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}
