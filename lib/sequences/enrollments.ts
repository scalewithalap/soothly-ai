/**
 * Email Sequence Enrollment Service
 * Manages contact enrollments in sequences
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { inngest } from "@/inngest/client";
import {
  type Enrollment,
  type BulkEnrollInput,
  type BulkEnrollResult,
  type ContactData,
  type EnrollmentStatus,
  ContactDataSchema,
} from "./types";

type EnrollmentRow =
  Database["public"]["Tables"]["email_sequence_enrollments"]["Row"];

// ============================================================================
// Transform Functions
// ============================================================================

function transformEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    sequenceId: row.sequence_id,
    orgId: row.org_id,
    contactEmail: row.contact_email,
    contactData: ContactDataSchema.parse(row.contact_data ?? {}),
    status: row.status as EnrollmentStatus,
    currentStep: row.current_step ?? 0,
    nextSendAt: row.next_send_at,
    startedAt: row.started_at ?? new Date().toISOString(),
    completedAt: row.completed_at,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

// ============================================================================
// Enrollment CRUD
// ============================================================================

export async function listEnrollments(
  sequenceId: string,
  options?: {
    status?: EnrollmentStatus;
    limit?: number;
    offset?: number;
  },
): Promise<{ enrollments: Enrollment[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("email_sequence_enrollments")
    .select("*", { count: "exact" })
    .eq("sequence_id", sequenceId)
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
    throw new Error(`Failed to list enrollments: ${error.message}`);
  }

  return {
    enrollments: (data ?? []).map(transformEnrollment),
    total: count ?? 0,
  };
}

export async function getEnrollment(
  enrollmentId: string,
): Promise<Enrollment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get enrollment: ${error.message}`);
  }

  return transformEnrollment(data);
}

export async function getEnrollmentByEmail(
  sequenceId: string,
  email: string,
): Promise<Enrollment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("sequence_id", sequenceId)
    .eq("contact_email", email.toLowerCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get enrollment: ${error.message}`);
  }

  return transformEnrollment(data);
}

/**
 * Enroll multiple contacts in a sequence
 */
export async function bulkEnroll(
  sequenceId: string,
  input: BulkEnrollInput,
): Promise<BulkEnrollResult> {
  const supabase = await createClient();

  // Get user's org_id
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .single();

  if (userError || !userData?.org_id) {
    throw new Error("Failed to determine organization");
  }

  const orgId = userData.org_id;
  const result: BulkEnrollResult = {
    enrolled: 0,
    skipped: 0,
    enrollments: [],
    errors: [],
  };

  // Get first step for scheduling
  const { data: steps } = await supabase
    .from("email_sequence_steps")
    .select("id, delay_days, delay_hours")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true })
    .limit(1);

  const firstStep = steps?.[0];

  for (const contact of input.contacts) {
    const email = contact.email.toLowerCase();

    // Check for duplicates if skipDuplicates is enabled
    if (input.skipDuplicates) {
      const { data: existing } = await supabase
        .from("email_sequence_enrollments")
        .select("id")
        .eq("sequence_id", sequenceId)
        .eq("contact_email", email)
        .single();

      if (existing) {
        result.skipped++;
        continue;
      }
    }

    const contactData: ContactData = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      title: contact.title,
      customFields: contact.customFields,
    };

    // Calculate next send time (first step delay from now)
    const nextSendAt = calculateNextSendTime(
      new Date(),
      firstStep?.delay_days ?? 0,
      firstStep?.delay_hours ?? 0,
    );

    try {
      const { data: enrollment, error } = await supabase
        .from("email_sequence_enrollments")
        .insert({
          sequence_id: sequenceId,
          org_id: orgId,
          contact_email: email,
          contact_data:
            contactData as unknown as Database["public"]["Tables"]["email_sequence_enrollments"]["Insert"]["contact_data"],
          status: "active",
          current_step: 0,
          next_send_at: nextSendAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        result.errors.push({ email, error: error.message });
        continue;
      }

      // Emit Inngest event to start sequence processing
      await inngest.send({
        name: "sequence/enrollment.created",
        data: {
          enrollmentId: enrollment.id,
          sequenceId,
          orgId,
          contactEmail: email,
        },
      });

      result.enrolled++;
      result.enrollments.push(enrollment.id);
    } catch (err) {
      result.errors.push({
        email,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}

/**
 * Enroll a single contact in a sequence
 * Convenience wrapper around bulkEnroll
 */
export async function enrollContact(
  sequenceId: string,
  contact: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    title?: string;
    customFields?: Record<string, string>;
  },
): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
  const result = await bulkEnroll(sequenceId, {
    contacts: [contact],
    skipDuplicates: false,
  });

  if (result.enrolled > 0 && result.enrollments.length > 0) {
    return { success: true, enrollmentId: result.enrollments[0] };
  }

  if (result.errors.length > 0) {
    return { success: false, error: result.errors[0].error };
  }

  if (result.skipped > 0) {
    return { success: false, error: "Contact already enrolled or invalid" };
  }

  return { success: false, error: "Unknown error during enrollment" };
}

/**
 * Pause an enrollment
 */
export async function pauseEnrollment(
  enrollmentId: string,
): Promise<Enrollment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .update({ status: "paused", next_send_at: null })
    .eq("id", enrollmentId)
    .eq("status", "active")
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to pause enrollment: ${error.message}`);
  }

  return transformEnrollment(data);
}

/**
 * Resume a paused enrollment
 */
export async function resumeEnrollment(
  enrollmentId: string,
): Promise<Enrollment> {
  const supabase = await createClient();

  // Get the enrollment to determine current step
  const { data: enrollment } = await supabase
    .from("email_sequence_enrollments")
    .select("*, email_sequence_steps!inner(*)")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  // Get the current step
  const { data: steps } = await supabase
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", enrollment.sequence_id)
    .order("step_order", { ascending: true });

  const currentStepIndex = enrollment.current_step ?? 0;
  const nextStep = steps?.[currentStepIndex];

  // Calculate next send time
  const nextSendAt = nextStep
    ? calculateNextSendTime(
        new Date(),
        nextStep.delay_days,
        nextStep.delay_hours ?? 0,
      )
    : new Date();

  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .update({
      status: "active",
      next_send_at: nextSendAt.toISOString(),
    })
    .eq("id", enrollmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to resume enrollment: ${error.message}`);
  }

  return transformEnrollment(data);
}

/**
 * Remove an enrollment (unsubscribe)
 */
export async function removeEnrollment(enrollmentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_sequence_enrollments")
    .update({ status: "unsubscribed", next_send_at: null })
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(`Failed to remove enrollment: ${error.message}`);
  }
}

/**
 * Mark enrollment as completed
 */
export async function completeEnrollment(enrollmentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_sequence_enrollments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      next_send_at: null,
    })
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(`Failed to complete enrollment: ${error.message}`);
  }
}

/**
 * Update enrollment status (for bounces, replies, etc.)
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus,
): Promise<void> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };

  if (["completed", "bounced", "replied", "unsubscribed"].includes(status)) {
    updates.next_send_at = null;
  }

  if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("email_sequence_enrollments")
    .update(updates as any)
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(`Failed to update enrollment status: ${error.message}`);
  }
}

/**
 * Advance enrollment to next step
 */
export async function advanceEnrollment(
  enrollmentId: string,
  nextStepDelay?: { days: number; hours: number },
): Promise<void> {
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("email_sequence_enrollments")
    .select("current_step")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  const nextStep = (enrollment.current_step ?? 0) + 1;
  const nextSendAt = nextStepDelay
    ? calculateNextSendTime(new Date(), nextStepDelay.days, nextStepDelay.hours)
    : null;

  const { error } = await supabase
    .from("email_sequence_enrollments")
    .update({
      current_step: nextStep,
      next_send_at: nextSendAt?.toISOString() ?? null,
    })
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(`Failed to advance enrollment: ${error.message}`);
  }
}

/**
 * Get enrollments due for sending
 */
export async function getPendingEnrollments(limit = 50): Promise<Enrollment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString())
    .order("next_send_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get pending enrollments: ${error.message}`);
  }

  return (data ?? []).map(transformEnrollment);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculate the next send time based on delay
 */
function calculateNextSendTime(
  fromDate: Date,
  delayDays: number,
  delayHours: number,
): Date {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + delayDays);
  result.setHours(result.getHours() + delayHours);
  return result;
}
