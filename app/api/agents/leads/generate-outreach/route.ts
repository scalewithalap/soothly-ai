import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateWithModel } from "@/lib/ai";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIModel } from "@/lib/ai/providers/types";

const generateOutreachSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
  channel: z.enum(["email", "linkedin"]),
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
 * POST /api/agents/leads/generate-outreach
 * Generate personalized outreach for a lead
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const parsed = await validateBody(request, generateOutreachSchema);

  // Get user's org
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Get lead details
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", parsed.leadId)
    .eq("org_id", userData.org_id)
    .single();

  if (contactError || !contact) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Lead not found", 404);
  }

  // Get lead enrichment data if available
  const { data: leadContact } = await supabase
    .from("lead_contacts")
    .select("enrichment_data, lead_score")
    .eq("contact_id", parsed.leadId)
    .single();

  const enrichment = leadContact?.enrichment_data || {};
  const leadScore = leadContact?.lead_score || 50;

  // Build the personalization prompt
  const channelInstructions =
    parsed.channel === "email"
      ? "Write a professional but warm email. Include a clear subject line suggestion at the top. Keep it concise (under 150 words body)."
      : "Write a LinkedIn connection request or InMail. Keep it brief and personable (under 80 words).";

  const prompt = `You are an expert B2B sales copywriter. Generate a personalized ${parsed.channel} outreach message.

PROSPECT INFORMATION:
- Name: ${contact.first_name || ""} ${contact.last_name || ""}
- Title: ${contact.title || "Unknown"}
- Company: ${contact.company || "Unknown"}
- Email: ${contact.email || "N/A"}
${enrichment.summary ? `- Company Summary: ${enrichment.summary}` : ""}
${enrichment.techStack ? `- Tech Stack: ${(enrichment.techStack as string[]).join(", ")}` : ""}
${enrichment.aiScoreReason ? `- AI Match Reason: ${enrichment.aiScoreReason}` : ""}

${parsed.context ? `ADDITIONAL CONTEXT:\n${parsed.context}` : ""}

INSTRUCTIONS:
${channelInstructions}
- Reference something specific about them or their company
- Focus on value, not features
- End with a clear, low-friction call to action
- Sound human, not robotic

Generate the message:`;

  const result = await generateWithModel(parsed.model as AIModel, prompt, {
    temperature: 0.7,
    maxTokens: 500,
  });

  // Log activity
  await supabase.from("activities").insert({
    user_id: user.id,
    org_id: userData.org_id,
    agent_type: "lead_generation",
    action: "outreach_generated",
    entity_type: "contact",
    entity_id: parsed.leadId,
    description: `Generated ${parsed.channel} outreach for ${contact.first_name || "lead"}`,
    metadata: {
      model: parsed.model,
      channel: parsed.channel,
      leadScore,
    },
  });

  return apiSuccess({
    content: result.content,
    channel: parsed.channel,
    leadId: parsed.leadId,
    model: parsed.model,
  });
});
