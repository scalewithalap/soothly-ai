import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
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
  title: z.string().min(5),
  primary_keyword: z.string().min(2),
  content_type: z
    .enum(["blog_post", "landing_page", "pillar_content"])
    .default("blog_post"),
  target_word_count: z.number().min(500).default(1500),
  ai_model: aiModelEnum.default("gemini-3-pro"),
});

// GET /api/agents/content/briefs - List briefs for current org
export async function GET() {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    const { data: briefs, error } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching briefs:", error);
      return NextResponse.json({ error: "db/fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ briefs });
  } catch (error) {
    console.error("Briefs GET error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// POST /api/agents/content/briefs - Create a new brief
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBriefSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    const { data: brief, error } = await supabase
      .from("content_briefs")
      .insert({
        org_id: userData.org_id,
        title: parsed.data.title,
        primary_keyword: parsed.data.primary_keyword,
        content_type: parsed.data.content_type,
        target_word_count: parsed.data.target_word_count,
        ai_model: parsed.data.ai_model,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating brief:", error);
      return NextResponse.json({ error: "db/create_failed" }, { status: 500 });
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
        model: parsed.data.ai_model,
      },
    });

    return NextResponse.json({ brief }, { status: 201 });
  } catch (error) {
    console.error("Briefs POST error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
