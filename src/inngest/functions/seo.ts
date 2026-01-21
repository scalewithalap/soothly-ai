/**
 * SEO Content Agent Functions
 * Background jobs for content generation and optimization with multi-model support
 */

import { inngest } from "@/inngest/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generateWithModel, getGemini } from "@/lib/ai";
import {
  notifyAgentCompletion,
  getOrgOwnerNotificationPreferences,
} from "@/lib/notifications";
import { createSemanticCache } from "@/agents/memory";
import {
  parseAgentEventData,
  requiresApproval,
  requestApprovalAndWait,
} from "@/inngest/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIModel } from "@/lib/ai/providers/types";

// Type helper to work around typed client limitations
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Get organization owner for notifications
 */
async function getOrgOwner(orgId: string): Promise<{
  email?: string;
  phone?: string;
  name?: string;
} | null> {
  const supabase = getUntypedClient();
  const { data } = await supabase
    .from("users")
    .select("email, phone, full_name")
    .eq("org_id", orgId)
    .single();

  if (!data) return null;

  return {
    email: data.email,
    phone: data.phone,
    name: data.full_name,
  };
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

    // Step 2: Get brief details
    const brief = await step.run("get-brief", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("content_briefs")
        .select("*")
        .eq("id", briefId)
        .single();
      return data;
    });

    if (!brief) {
      return { success: false, error: "Brief not found" };
    }

    // Step 3: Research keywords using AI
    const keywords = await step.run("research-keywords", async () => {
      const ai = getGemini();

      const result = await ai.complete(
        `Generate a list of 10-15 related keywords for the primary keyword "${brief.primary_keyword}".
        
For each keyword, estimate:
- search_volume (monthly, 0-100000)
- keyword_difficulty (0-100)
- relevance_score (0-100)

Return as JSON array:
[{ "keyword": "...", "search_volume": 1000, "keyword_difficulty": 45, "relevance_score": 90 }]`,
        { model: "gemini-3-flash", temperature: 0.5 },
      );

      try {
        return JSON.parse(result.content);
      } catch {
        return [];
      }
    });

    // Step 4: Save keywords to database
    await step.run("save-keywords", async () => {
      const supabase = getUntypedClient();

      for (const kw of keywords) {
        await supabase.from("keywords").upsert({
          org_id: orgId,
          keyword: kw.keyword,
          search_volume: kw.search_volume,
          keyword_difficulty: kw.keyword_difficulty,
          status: "discovered",
        });
      }

      // Update brief with secondary keywords
      await supabase
        .from("content_briefs")
        .update({
          secondary_keywords: keywords
            .slice(0, 5)
            .map((k: { keyword: string }) => k.keyword),
          status: "researching",
        })
        .eq("id", briefId);
    });

    // Step 5: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "seo_content",
        action: "brief_processing",
        entity_type: "content_brief",
        entity_id: briefId,
        description: `Content brief processing started, ${keywords.length} keywords researched`,
        metadata: { keywordCount: keywords.length },
      });
    });

    return { success: true, briefId, keywordsFound: keywords.length };
  },
);

/**
 * Generate full article from brief with user-selected AI model
 */
export const generateArticle = inngest.createFunction(
  {
    id: "content-generate-article",
    name: "Generate Article",
    retries: 3,
  },
  { event: "content/article.generate" },
  async ({ event, step }) => {
    const { briefId, orgId, model, config } = event.data as {
      briefId: string;
      orgId: string;
      model?: AIModel;
      config?: {
        brandVoice?: string;
        targetAudience?: string;
        contentGuidelines?: string[];
      };
    };

    // Default to gemini-3-flash if no model specified
    const selectedModel: AIModel = model || "gemini-3-flash";

    // Step 1: Get brief details
    const brief = await step.run("get-brief", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("content_briefs")
        .select("*")
        .eq("id", briefId)
        .single();
      return data as {
        title: string;
        primary_keyword: string;
        secondary_keywords?: string[];
        content_type?: string;
        target_word_count?: number;
      } | null;
    });

    if (!brief) {
      throw new Error(`Brief ${briefId} not found`);
    }

    // Step 2: Generate article outline
    const outline = await step.run("generate-outline", async () => {
      const result = await generateWithModel(
        selectedModel,
        `Create a detailed article outline for:
        
Title: ${brief.title}
Primary Keyword: ${brief.primary_keyword}
Secondary Keywords: ${brief.secondary_keywords?.join(", ") || "None"}
Content Type: ${brief.content_type || "blog_post"}
Target Word Count: ${brief.target_word_count || 1500}

${config?.brandVoice ? `Brand Voice: ${config.brandVoice}` : ""}
${config?.targetAudience ? `Target Audience: ${config.targetAudience}` : ""}

Create a comprehensive outline with:
1. Introduction with hook
2. 5-7 main sections with H2 headings
3. Sub-sections with H3 headings where appropriate
4. Key points to cover in each section
5. Conclusion with call-to-action

Return as JSON:
{
  "title": "...",
  "meta_description": "...",
  "sections": [
    { "heading": "...", "level": 2, "points": ["...", "..."] }
  ]
}`,
        { temperature: 0.7, maxTokens: 2000 },
      );

      try {
        return JSON.parse(result.content);
      } catch {
        return { title: brief.title, sections: [] };
      }
    });

    // Step 3: Generate full article content
    const article = await step.run("generate-content", async () => {
      const sectionsText =
        outline.sections
          ?.map(
            (s: { heading: string; points?: string[] }) =>
              `## ${s.heading}\n${
                s.points?.map((p: string) => `- ${p}`).join("\n") || ""
              }`,
          )
          .join("\n\n") || "";

      const result = await generateWithModel(
        selectedModel,
        `Write a comprehensive, SEO-optimized article based on this outline:

Title: ${outline.title || brief.title}
Primary Keyword: ${brief.primary_keyword}
Secondary Keywords: ${brief.secondary_keywords?.join(", ") || "None"}
Target Word Count: ${brief.target_word_count || 1500}

OUTLINE:
${sectionsText}

${config?.brandVoice ? `Brand Voice Guidelines: ${config.brandVoice}` : ""}
${config?.targetAudience ? `Target Audience: ${config.targetAudience}` : ""}
${
  config?.contentGuidelines
    ? `Additional Guidelines:\n${config.contentGuidelines.join("\n")}`
    : ""
}

REQUIREMENTS:
1. Write in markdown format
2. Use the primary keyword naturally 3-5 times, including in the first paragraph
3. Include secondary keywords where relevant
4. Write engaging, informative content
5. Use short paragraphs for readability
6. Include a compelling introduction and conclusion
7. Aim for the target word count

Write the complete article:`,
        { temperature: 0.7, maxTokens: 8000 },
      );

      const content = result.content;
      const wordCount = content.split(/\s+/).length;

      return {
        title: outline.title || brief.title,
        meta_description: outline.meta_description || "",
        content,
        wordCount,
      };
    });

    // Step 4: Save article to database
    const savedArticle = await step.run("save-article", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("articles")
        .insert({
          org_id: orgId,
          brief_id: briefId,
          title: article.title,
          content: article.content,
          word_count: article.wordCount,
          meta_description: article.meta_description,
          primary_keyword: brief.primary_keyword,
          ai_model: selectedModel,
          status: "draft",
          seo_score: 0,
          metadata: {
            outline,
            generatedAt: new Date().toISOString(),
          },
        })
        .select()
        .single();

      return data;
    });

    // Step 5: Update brief status
    await step.run("update-brief-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("content_briefs")
        .update({ status: "completed" })
        .eq("id", briefId);
    });

    // Step 6: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "seo_content",
        action: "article_generated",
        entity_type: "article",
        entity_id: savedArticle?.id || briefId,
        description: `Article "${article.title}" generated (${article.wordCount} words) using ${selectedModel}`,
        metadata: { wordCount: article.wordCount, model: selectedModel },
      });
    });

    // Step 7: Send notification with user preferences
    await step.run("send-notification", async () => {
      const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
      if (
        ownerPrefs &&
        ownerPrefs.preferences.eventPreferences.agentCompletion
      ) {
        const owner = await getOrgOwner(orgId);
        if (owner) {
          await notifyAgentCompletion(
            owner,
            {
              agentName: "SEO Content",
              action: "Article Generation",
              resultCount: article.wordCount,
              details: `Article "${article.title}" has been generated with ${article.wordCount} words using ${selectedModel}.`,
            },
            ownerPrefs.preferences.channels,
            ownerPrefs.preferences.config,
          );
        }
      }
    });

    return {
      success: true,
      articleId: savedArticle?.id,
      title: article.title,
      wordCount: article.wordCount,
      model: selectedModel,
    };
  },
);

/**
 * Optimize article SEO
 */
export const optimizeArticleSEO = inngest.createFunction(
  {
    id: "content-optimize-seo",
    name: "Optimize Article SEO",
  },
  { event: "content/article.optimize" },
  async ({ event, step }) => {
    const { articleId, orgId } = event.data as {
      articleId: string;
      orgId: string;
    };

    // Step 1: Get article
    const article = await step.run("get-article", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();
      return data;
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    // Step 2: Analyze SEO
    const analysis = await step.run("analyze-seo", async () => {
      const ai = getGemini();

      const result = await ai.complete(
        `Analyze this article for SEO optimization:

Title: ${article.title}
Primary Keyword: ${article.primary_keyword}
Content: ${article.content.substring(0, 5000)}...

Provide:
1. SEO score (0-100)
2. List of issues found
3. Suggestions for improvement
4. Optimized meta title (max 60 chars)
5. Optimized meta description (max 155 chars)

Return as JSON:
{
  "seo_score": 75,
  "issues": ["...", "..."],
  "suggestions": ["...", "..."],
  "meta_title": "...",
  "meta_description": "..."
}`,
        { model: "gemini-3-flash", temperature: 0.3 },
      );

      try {
        return JSON.parse(result.content);
      } catch {
        return { seo_score: 0, issues: [], suggestions: [] };
      }
    });

    // Step 3: Update article with SEO data
    await step.run("update-article", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("articles")
        .update({
          seo_score: analysis.seo_score,
          seo_issues: analysis.issues,
          seo_suggestions: analysis.suggestions,
          meta_title: analysis.meta_title,
          meta_description: analysis.meta_description,
          status: "review",
        })
        .eq("id", articleId);
    });

    // Step 4: Notify
    await step.run("send-notification", async () => {
      const owner = await getOrgOwner(orgId);
      if (owner) {
        await notifyAgentCompletion(
          owner,
          {
            agentName: "SEO Content",
            action: "SEO Optimization",
            details: `Article "${article.title}" SEO analysis complete. Score: ${analysis.seo_score}/100`,
          },
          ["email"],
        );
      }
    });

    return { success: true, seoScore: analysis.seo_score };
  },
);
