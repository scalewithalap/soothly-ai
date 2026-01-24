/**
 * Email Sequence Types & Zod Schemas
 * Type definitions for the Email Sequencing Engine
 */

import { z } from "zod";

// ============================================================================
// Status Enums
// ============================================================================

export const SequenceStatus = z.enum(["draft", "active", "paused", "archived"]);
export type SequenceStatus = z.infer<typeof SequenceStatus>;

export const EnrollmentStatus = z.enum([
  "active",
  "completed",
  "paused",
  "unsubscribed",
  "bounced",
  "replied",
]);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatus>;

export const EventType = z.enum([
  "sent",
  "delivered",
  "opened",
  "clicked",
  "replied",
  "bounced",
  "complained",
]);
export type EventType = z.infer<typeof EventType>;

// ============================================================================
// Sequence Schemas
// ============================================================================

export const SequenceSettingsSchema = z.object({
  stopOnReply: z.boolean().default(true),
  dailySendLimit: z.number().int().positive().default(50),
  sendDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]), // Mon-Fri
  sendHours: z
    .object({
      start: z.number().int().min(0).max(23).default(9),
      end: z.number().int().min(0).max(23).default(17),
    })
    .default({ start: 9, end: 17 }),
  timezone: z.string().default("UTC"),
});
export type SequenceSettings = z.infer<typeof SequenceSettingsSchema>;

export const SequenceStatsSchema = z.object({
  enrolled: z.number().int().default(0),
  completed: z.number().int().default(0),
  active: z.number().int().default(0),
  totalSent: z.number().int().default(0),
  totalOpened: z.number().int().default(0),
  totalClicked: z.number().int().default(0),
  totalReplied: z.number().int().default(0),
  totalBounced: z.number().int().default(0),
  openRate: z.number().default(0),
  replyRate: z.number().default(0),
});
export type SequenceStats = z.infer<typeof SequenceStatsSchema>;

export const CreateSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  fromName: z.string().min(1).max(100),
  fromEmail: z.string().email(),
  replyToEmail: z.string().email().optional(),
  settings: SequenceSettingsSchema.optional(),
});
export type CreateSequenceInput = z.infer<typeof CreateSequenceSchema>;

export const UpdateSequenceSchema = CreateSequenceSchema.partial().extend({
  status: SequenceStatus.optional(),
});
export type UpdateSequenceInput = z.infer<typeof UpdateSequenceSchema>;

// ============================================================================
// Step Schemas
// ============================================================================

export const CreateStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  delayDays: z.number().int().min(0).default(1),
  delayHours: z.number().int().min(0).max(23).default(0),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
});
export type CreateStepInput = z.infer<typeof CreateStepSchema>;

export const UpdateStepSchema = CreateStepSchema.partial();
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>;

export const ReorderStepsSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string().uuid(),
      stepOrder: z.number().int().positive(),
    }),
  ),
});
export type ReorderStepsInput = z.infer<typeof ReorderStepsSchema>;

// ============================================================================
// Enrollment Schemas
// ============================================================================

export const ContactDataSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});
export type ContactData = z.infer<typeof ContactDataSchema>;

export const EnrollContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});
export type EnrollContactInput = z.infer<typeof EnrollContactSchema>;

export const BulkEnrollSchema = z.object({
  contacts: z.array(EnrollContactSchema).min(1).max(1000),
  skipDuplicates: z.boolean().default(true),
});
export type BulkEnrollInput = z.infer<typeof BulkEnrollSchema>;

// ============================================================================
// Event Schemas
// ============================================================================

export const EventMetadataSchema = z.object({
  linkUrl: z.string().url().optional(),
  errorCode: z.string().optional(),
  bounceType: z.string().optional(),
  complaintType: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});
export type EventMetadata = z.infer<typeof EventMetadataSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface Sequence {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: SequenceStatus;
  fromName: string;
  fromEmail: string;
  replyToEmail: string | null;
  settings: SequenceSettings;
  stats: SequenceStats;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  stepOrder: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SequenceWithSteps extends Sequence {
  steps: SequenceStep[];
}

export interface Enrollment {
  id: string;
  sequenceId: string;
  orgId: string;
  contactEmail: string;
  contactData: ContactData;
  status: EnrollmentStatus;
  currentStep: number;
  nextSendAt: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEvent {
  id: string;
  enrollmentId: string;
  stepId: string | null;
  eventType: EventType;
  sesMessageId: string | null;
  metadata: EventMetadata;
  createdAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface BulkEnrollResult {
  enrolled: number;
  skipped: number;
  enrollments: string[]; // Array of created enrollment IDs
  errors: Array<{ email: string; error: string }>;
}

export interface SequenceAnalytics {
  sequence: Sequence;
  stepMetrics: Array<{
    stepId: string;
    stepOrder: number;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    sent: number;
    opened: number;
    replied: number;
  }>;
}
