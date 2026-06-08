import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateWithModel } from "@/lib/ai";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIModel } from "@/lib/ai/providers/types";

const generateInlineSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
  context: z.string().optional().default(""),
  model: z
    .enum([
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
    ])
    .default("gemini-3-flash"),
});

/**
 * POST /api/agents/seo/generate-inline
 * Generate inline AI text for the SEO editor
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const parsed = await validateBody(request, generateInlineSchema);

  // Build the prompt for inline generation
  const prompt = `You are an expert SEO content writer. Generate content based on the following instruction.

INSTRUCTION: ${parsed.instruction}

${parsed.context ? `CONTEXT (existing content for reference):\n${parsed.context.slice(0, 2000)}` : ""}

REQUIREMENTS:
1. Write in a professional, engaging tone
2. Use SEO-friendly language naturally
3. Keep the content relevant and high-quality
4. Return ONLY the generated text, no explanations or metadata

Generate the content:`;

  const result = await generateWithModel(parsed.model as AIModel, prompt, {
    temperature: 0.7,
    maxTokens: 1000,
  });

  // Log activity
  await supabase.from("activities").insert({
    user_id: user.id,
    agent_type: "seo_content",
    action: "inline_generation",
    description: `Generated inline content: "${parsed.instruction.slice(0, 50)}..."`,
    metadata: {
      model: parsed.model,
      instructionLength: parsed.instruction.length,
    },
  });

  return apiSuccess({
    content: result.content,
    model: parsed.model,
  });
});
