import { z } from "zod";

/**
 * Shared Zod schemas for API validation.
 * Import and use these in API routes.
 */

// --- Common Primitives ---
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const positiveIntSchema = z.number().int().positive();

// --- Credits API ---
export const addCreditsSchema = z.object({
  amount: positiveIntSchema,
  reason: z.string().min(1, "Reason is required"),
});

export type AddCreditsInput = z.infer<typeof addCreditsSchema>;

// --- Leads API ---
export const createLeadSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1).optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "lost"]).default("new"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// --- Content API ---
export const generateContentSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  keywords: z.array(z.string()).optional(),
  wordCount: z.number().int().min(100).max(5000).optional().default(1000),
  tone: z
    .enum(["professional", "casual", "formal"])
    .optional()
    .default("professional"),
});

export type GenerateContentInput = z.infer<typeof generateContentSchema>;

// --- Team API ---
export const updateMemberRoleSchema = z.object({
  memberId: uuidSchema,
  role: z.enum(["admin", "member"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member"]).default("member"),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

// --- Organization API ---
export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  industry: z.string().optional(),
  size: z.string().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// --- Auth API ---
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// --- Profile API ---
export const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// --- Leads Pipeline API ---
export const pipelineStages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export const updatePipelineStageSchema = z.object({
  contactId: z.string().uuid(),
  stage: z.enum(pipelineStages),
});

export type UpdatePipelineStageInput = z.infer<
  typeof updatePipelineStageSchema
>;

// --- Organization Settings API ---
export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// --- Password Change API ---
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// --- Content Calendar API ---
export const updateCalendarItemSchema = z.object({
  briefId: z.string().uuid(),
  scheduledDate: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export type UpdateCalendarItemInput = z.infer<typeof updateCalendarItemSchema>;
