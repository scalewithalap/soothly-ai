/**
 * SEO Content Agent
 * Automates keyword research, content generation, and SEO optimization
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, CreditCost } from "../base/types";
import { getOpenAI } from "@/lib/ai";
import { inngest, AgentEvents } from "@/inngest/client";

export class SEOContentAgent extends BaseAgent {
  readonly name = "content" as const;
  readonly displayName = "SEO Content";
  readonly description =
    "Research keywords and publish SEO-optimized articles automatically.";

  readonly creditCost: CreditCost = {
    research: 2,
    generate: 10,
    optimize: 3,
    publish: 1,
  };

  private config: {
    brandVoice?: string;
    targetAudience?: string;
    contentGuidelines?: string[];
    seoSettings?: Record<string, unknown>;
  } = {};

  async initialize(): Promise<void> {
    this.config = (await this.getConfig()) as typeof this.config;
    await this.log("info", "SEOContentAgent initialized", {
      orgId: this.orgId,
    });
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      return { success: false, error: "agent/disabled" };
    }

    switch (task.action) {
      case "create_brief":
        return this.createBrief(
          task.params as {
            title: string;
            primaryKeyword: string;
            contentType?: string;
          }
        );
      case "research_keywords":
        return this.researchKeywords(task.params as { briefId: string });
      case "generate_article":
        return this.generateArticle(task.params as { briefId: string });
      case "optimize_seo":
        return this.optimizeSEO(task.params as { articleId: string });
      case "publish":
        return this.publishArticle(
          task.params as { articleId: string; url?: string }
        );
      default:
        return { success: false, error: "agent/unknown_action" };
    }
  }

  async cleanup(): Promise<void> {
    await this.log("info", "SEOContentAgent cleanup completed");
  }

  // ============================================
  // CONTENT BRIEF MANAGEMENT
  // ============================================

  private async createBrief(params: {
    title: string;
    primaryKeyword: string;
    contentType?: string;
  }): Promise<AgentResult> {
    const { data, error } = await (this.db as any)
      .from("content_briefs")
      .insert({
        org_id: this.orgId,
        title: params.title,
        primary_keyword: params.primaryKeyword,
        content_type: params.contentType || "blog_post",
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      await this.log("error", "Failed to create brief", { error });
      return { success: false, error: "content/brief_create_failed" };
    }

    await this.emit("content/brief.created", { briefId: data.id });

    return { success: true, data };
  }

  // ============================================
  // KEYWORD RESEARCH
  // ============================================

  private async researchKeywords(params: {
    briefId: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("research", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Get brief
    const { data: brief, error } = await (this.db as any)
      .from("content_briefs")
      .select()
      .eq("id", params.briefId)
      .single();

    if (error || !brief) {
      return { success: false, error: "content/brief_not_found" };
    }

    const ai = getOpenAI();

    try {
      const result = await ai.complete(
        `Generate a list of 10-15 related keywords for the primary keyword "${brief.primary_keyword}".
        
For each keyword, estimate:
- search_volume (monthly, 0-100000)
- keyword_difficulty (0-100)
- relevance_score (0-100)

Return as JSON array:
[{ "keyword": "...", "search_volume": 1000, "keyword_difficulty": 45, "relevance_score": 90 }]`,
        { model: "gemini-3-flash" as const, temperature: 0.5 }
      );

      const keywords = JSON.parse(result.content);

      // Save keywords to database
      for (const kw of keywords) {
        await (this.db as any).from("keywords").upsert({
          org_id: this.orgId,
          keyword: kw.keyword,
          search_volume: kw.search_volume,
          keyword_difficulty: kw.keyword_difficulty,
          status: "discovered",
        });
      }

      // Update brief with secondary keywords
      await (this.db as any)
        .from("content_briefs")
        .update({
          secondary_keywords: keywords
            .slice(0, 5)
            .map((k: { keyword: string }) => k.keyword),
          status: "researching",
        })
        .eq("id", params.briefId);

      return {
        success: true,
        data: { keywords, briefId: params.briefId },
        creditsUsed: 2,
      };
    } catch (err) {
      await this.log("error", "Keyword research failed", { error: err });
      return { success: false, error: "content/research_failed" };
    }
  }

  // ============================================
  // ARTICLE GENERATION
  // ============================================

  private async generateArticle(params: {
    briefId: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("generate", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Get brief
    const { data: brief, error } = await (this.db as any)
      .from("content_briefs")
      .select()
      .eq("id", params.briefId)
      .single();

    if (error || !brief) {
      return { success: false, error: "content/brief_not_found" };
    }

    // Trigger async generation
    await inngest.send({
      name: AgentEvents["content/article.generate"],
      data: {
        orgId: this.orgId,
        briefId: params.briefId,
        brief: brief,
        config: this.config,
      },
    });

    return {
      success: true,
      data: { message: "Article generation queued", briefId: params.briefId },
      creditsUsed: 10,
    };
  }

  // ============================================
  // SEO OPTIMIZATION
  // ============================================

  private async optimizeSEO(params: {
    articleId: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("optimize", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    // Get article
    const { data: article, error } = await (this.db as any)
      .from("articles")
      .select()
      .eq("id", params.articleId)
      .single();

    if (error || !article) {
      return { success: false, error: "content/article_not_found" };
    }

    const ai = getOpenAI();

    try {
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
        { model: "gemini-3-flash" as const, temperature: 0.3 }
      );

      const analysis = JSON.parse(result.content);

      // Update article with SEO data
      await (this.db as any)
        .from("articles")
        .update({
          seo_score: analysis.seo_score,
          seo_issues: analysis.issues,
          seo_suggestions: analysis.suggestions,
          meta_title: analysis.meta_title,
          meta_description: analysis.meta_description,
          status: "review",
        })
        .eq("id", params.articleId);

      await this.emit("content/article.optimized", {
        articleId: params.articleId,
        seoScore: analysis.seo_score,
      });

      return {
        success: true,
        data: analysis,
        creditsUsed: 3,
      };
    } catch (err) {
      await this.log("error", "SEO optimization failed", { error: err });
      return { success: false, error: "content/optimization_failed" };
    }
  }

  // ============================================
  // PUBLISHING
  // ============================================

  private async publishArticle(params: {
    articleId: string;
    url?: string;
  }): Promise<AgentResult> {
    const charged = await this.chargeCredits("publish", 1);
    if (!charged) {
      return { success: false, error: "credit/insufficient_balance" };
    }

    const { error } = await (this.db as any)
      .from("articles")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_url: params.url || null,
      })
      .eq("id", params.articleId);

    if (error) {
      return { success: false, error: "content/publish_failed" };
    }

    await this.emit("content/article.publish", { articleId: params.articleId });

    // Notify Lead Agent about new content for potential topic-based outreach
    await this.emit("agent/task.completed", {
      agent: "content",
      action: "publish",
      entityType: "article",
      entityId: params.articleId,
    });

    return {
      success: true,
      data: { published: true, articleId: params.articleId },
      creditsUsed: 1,
    };
  }
}
