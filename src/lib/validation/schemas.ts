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
