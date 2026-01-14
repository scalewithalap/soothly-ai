/**
 * SEO Content Agent Functions
 * Background jobs for content generation and optimization
 *
 * Note: Using type assertions due to Supabase client type generation lag.
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper to work around typed client limitations
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Handle new content brief creation
 * Kicks off AI-powered article generation
 */
export const handleBriefCreated = inngest.createFunction(
  {
    id: "content-brief-created",
    name: "Content Brief Created",
  },
  { event: "content/brief.created" },
  async ({ event, step }) => {
    const { briefId, orgId } = event.data as { briefId: string; orgId: string };

    // Step 1: Update brief status
    await step.run("update-brief-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("content_briefs")
        .update({ status: "in_progress" })
        .eq("id", briefId);
    });

    // Step 2: Research keywords (placeholder)
    const keywords = await step.run("research-keywords", async () => {
      // TODO: Implement keyword research via AI or SEO API
      console.log(`Researching keywords for brief ${briefId}`);
      return { primary: "", secondary: [] as string[] };
    });

    // Step 3: Generate article outline (placeholder)
    await step.run("generate-outline", async () => {
      // TODO: Use AI to generate article outline
      console.log(`Generating outline for brief ${briefId}`);
    });

    // Step 4: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "seo_content",
        action: "brief_processing",
        entity_type: "content_brief",
        entity_id: briefId,
        description: "Content brief processing started",
        metadata: { keywords },
      });
    });

    return { success: true, briefId };
  }
);

/**
 * Generate full article from brief
 */
export const generateArticle = inngest.createFunction(
  {
    id: "content-generate-article",
    name: "Generate Article",
    retries: 3,
  },
  { event: "content/article.generate" },
  async ({ event, step }) => {
    const { briefId, orgId } = event.data as { briefId: string; orgId: string };

    // Step 1: Get brief details
    const brief = await step.run("get-brief", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("content_briefs")
        .select("*")
        .eq("id", briefId)
        .single();
      return data as { title: string; primary_keyword: string } | null;
    });

    if (!brief) {
      throw new Error(`Brief ${briefId} not found`);
    }

    // Step 2: Generate article content (placeholder)
    const article = await step.run("generate-content", async () => {
      // TODO: Call AI API to generate article
      console.log(`Generating article for: ${brief.title}`);
      return {
        title: brief.title,
        content: "<!-- AI-generated content would go here -->",
        wordCount: 0,
      };
    });

    // Step 3: Save article to database
    await step.run("save-article", async () => {
      const supabase = getUntypedClient();
      await supabase.from("articles").insert({
        org_id: orgId,
        brief_id: briefId,
        title: article.title,
        content: article.content,
        word_count: article.wordCount,
        status: "draft",
        seo_score: 0,
        metadata: {},
      });
    });

    return { success: true, article };
  }
);
