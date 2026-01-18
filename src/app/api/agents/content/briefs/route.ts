import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supported AI models for article generation
const aiModelEnum = z.enum([
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
]);

const createBriefSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  primary_keyword: z.string().min(2, "Keyword must be at least 2 characters"),
  content_type: z
    .enum(["blog_post", "landing_page", "pillar_content"])
    .default("blog_post"),
  target_word_count: z.number().min(500).default(1500),
  ai_model: aiModelEnum.default("gemini-3-flash"),
});

// GET /api/agents/content/briefs - List briefs for current org
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: briefs, error } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching briefs:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch briefs",
      500,
    );
  }

  return apiSuccess({ briefs });
});

// POST /api/agents/content/briefs - Create a new brief
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Validate request body
  const parsed = await validateBody(request, createBriefSchema);

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: brief, error } = await supabase
    .from("content_briefs")
    .insert({
      org_id: userData.org_id,
      title: parsed.title,
      primary_keyword: parsed.primary_keyword,
      content_type: parsed.content_type,
      target_word_count: parsed.target_word_count,
      ai_model: parsed.ai_model,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating brief:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to create brief",
      500,
    );
  }

  // Trigger Inngest event for background processing with model selection
  await inngest.send({
    name: "content/brief.created",
    data: {
      briefId: (brief as { id: string }).id,
      orgId: userData.org_id,
    },
  });

  // Also trigger article generation with selected model
  await inngest.send({
    name: "content/article.generate",
    data: {
      briefId: (brief as { id: string }).id,
      orgId: userData.org_id,
      model: parsed.ai_model,
    },
  });

  return apiSuccess({ brief }, 201);
});

