/**
 * LLM Output Schemas
 *
 * Centralized Zod schemas for validating LLM structured outputs.
 * Per backend-design/SKILL.md §4: "All LLM calls must use Zod schemas to enforce structure."
 *
 * Usage:
 *   const result = await ai.complete(prompt);
 *   const parsed = KeywordListSchema.safeParse(JSON.parse(result.content));
 *   if (!parsed.success) throw new ValidationError("LLM output invalid", parsed.error);
 */

import { z } from "zod";

// ============================================
// SEO AGENT SCHEMAS
// ============================================

/**
 * Keyword research output schema
 */
export const KeywordSchema = z.object({
  keyword: z.string().min(1),
  search_volume: z.number().int().min(0).max(100000000),
  keyword_difficulty: z.number().min(0).max(100),
  relevance_score: z.number().min(0).max(100).optional(),
});

export const KeywordListSchema = z.array(KeywordSchema);

export type Keyword = z.infer<typeof KeywordSchema>;

/**
 * Article outline schema
 */
export const OutlineSectionSchema = z.object({
  heading: z.string().min(1),
  level: z.number().int().min(1).max(6).default(2),
  points: z.array(z.string()).optional(),
});

export const ArticleOutlineSchema = z.object({
  title: z.string().min(1),
  meta_description: z.string().max(160).optional(),
  sections: z.array(OutlineSectionSchema).default([]),
});

export type ArticleOutline = z.infer<typeof ArticleOutlineSchema>;

/**
 * Generated article schema
 */
export const GeneratedArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(100),
  meta_description: z.string().max(160).optional(),
  seo_score: z.number().min(0).max(100).optional(),
});

export type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>;

/**
 * SEO analysis schema
 */
export const SEOAnalysisSchema = z.object({
  current_score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
  suggestions: z.array(z.string()).optional(),
  optimized_meta_description: z.string().max(160).optional(),
  optimized_title: z.string().max(70).optional(),
});

export type SEOAnalysis = z.infer<typeof SEOAnalysisSchema>;

// ============================================
// LEAD GEN AGENT SCHEMAS
// ============================================

/**
 * Lead score output schema
 */
export const LeadScoreSchema = z.object({
  index: z.number().int().min(0),
  score: z.number().min(0).max(100),
  reason: z.string(),
});

export const LeadScoreListSchema = z.array(LeadScoreSchema);

export type LeadScore = z.infer<typeof LeadScoreSchema>;

// ============================================
// SUPERAGENT SCHEMAS
// ============================================

/**
 * Campaign step schema for AI-planned campaigns
 */
export const CampaignStepSchema = z.object({
  agentType: z.enum([
    "lead_gen",
    "seo",
    "partnership",
    "proposal",
    "competitor_intel",
    "customer_success",
    "revenue_recovery",
    "onboarding",
  ]),
  action: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  dependsOn: z.array(z.string()).default([]),
});

export const CampaignPlanSchema = z.array(CampaignStepSchema).max(5);

export type CampaignStep = z.infer<typeof CampaignStepSchema>;

// ============================================
// COMPETITOR INTEL SCHEMAS
// ============================================

/**
 * Change analysis schema
 */
export const ChangeAnalysisSchema = z.object({
  type: z.enum([
    "price_change",
    "new_feature",
    "feature_removed",
    "headline_change",
    "content_update",
    "unknown",
  ]),
  description: z.string(),
  impact: z.enum(["low", "medium", "high", "critical"]),
  recommended_action: z.string().optional(),
});

export type ChangeAnalysis = z.infer<typeof ChangeAnalysisSchema>;

// ============================================
// PROPOSAL AGENT SCHEMAS
// ============================================

/**
 * Prospect analysis schema
 */
export const ProspectAnalysisSchema = z.object({
  company_name: z.string().min(1),
  industry: z.string().optional(),
  size_estimate: z.string().optional(),
  pain_points: z.array(z.string()).default([]),
  value_propositions: z.array(z.string()).default([]),
  proposal_angle: z.string().optional(),
  headline: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type ProspectAnalysis = z.infer<typeof ProspectAnalysisSchema>;

/**
 * Generated proposal schema
 */
export const GeneratedProposalSchema = z.object({
  title: z.string().min(1),
  executive_summary: z.string(),
  challenge: z.string(),
  solution: z.string(),
  outcomes: z.array(z.string()).default([]),
  differentiators: z.array(z.string()).default([]),
  next_steps: z.string(),
});

export type GeneratedProposal = z.infer<typeof GeneratedProposalSchema>;

// ============================================
// CUSTOMER SUCCESS SCHEMAS
// ============================================

/**
 * Support response schema
 */
export const SupportResponseSchema = z.object({
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1),
  intent: z.enum([
    "billing",
    "account",
    "technical",
    "feature",
    "general",
    "unknown",
  ]),
  suggested_actions: z
    .array(
      z.object({
        action: z.string(),
        risk_level: z.enum(["low", "medium", "high"]),
      }),
    )
    .optional(),
  escalate: z.boolean().default(false),
  escalation_reason: z.string().optional(),
});

export type SupportResponse = z.infer<typeof SupportResponseSchema>;

// ============================================
// REFLECTION SCHEMAS
// ============================================

/**
 * Reflection output schema for Draft → Reflect → Finalize pattern
 */
export const ReflectionSchema = z.object({
  is_valid: z.boolean(),
  quality_score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  improvements: z.array(z.string()).optional(),
  should_regenerate: z.boolean().default(false),
});

export type Reflection = z.infer<typeof ReflectionSchema>;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Safe parse with logging for LLM outputs
 */
export function safeParseLLMOutput<T>(
  schema: z.ZodSchema<T>,
  content: string,
  fallback: T,
): { success: boolean; data: T; errors?: z.ZodError } {
  try {
    const json = JSON.parse(content);
    const result = schema.safeParse(json);
    if (result.success) {
      return { success: true, data: result.data };
    }
    console.warn("LLM output validation failed:", result.error.issues);
    return { success: false, data: fallback, errors: result.error };
  } catch (parseError) {
    console.warn("LLM output JSON parse failed:", parseError);
    return { success: false, data: fallback };
  }
}
