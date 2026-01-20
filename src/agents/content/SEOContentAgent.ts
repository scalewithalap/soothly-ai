/**
 * SEO Content Agent
 * Automates keyword research, content generation, and SEO optimization
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { getOpenAI } from "@/lib/ai";
import { inngest, AgentEvents } from "@/inngest/client";

export class SEOContentAgent extends BaseAgent {
  readonly name = "seo" as const;
  readonly displayName = "SEO Content";
  readonly description =
    "Research keywords and publish SEO-optimized articles automatically.";

  readonly usageCost: UsageCost = {
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
          },
        );
      case "research_keywords":
        return this.researchKeywords(task.params as { briefId: string });
      case "generate_article":
        return this.generateArticle(task.params as { briefId: string });
      case "optimize_seo":
        return this.optimizeSEO(task.params as { articleId: string });
      case "publish":
        return this.publishArticle(
          task.params as { articleId: string; url?: string },
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
    const charged = await this.consumeUsage("research", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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
        `You are an expert SEO strategist. Analyze and generate related keywords for the primary keyword "${brief.primary_keyword}".

## TASK
Generate 10-15 high-value related keywords that could drive organic traffic.

## ANALYSIS REQUIREMENTS
For each keyword, provide:
1. **search_volume**: Estimated monthly searches (0-100000)
2. **keyword_difficulty**: Competition score 0-100 where:
   - 0-30: Low competition (easy to rank)
   - 31-60: Medium competition (moderate effort)
   - 61-100: High competition (difficult to rank)
3. **relevance_score**: How closely it relates to the primary keyword (0-100)
4. **intent**: User search intent classification:
   - "informational": User wants to learn (e.g., "how to", "what is")
   - "transactional": User wants to buy/act (e.g., "best", "buy", "price")
   - "navigational": User seeks specific site/brand
   - "commercial": User researching before purchase
5. **opportunity_score**: Combined value score considering:
   - Higher search volume = better
   - Lower difficulty = better  
   - Higher relevance = better
   - Transactional/commercial intent = better for conversions

## PRIORITIZATION RULES
- Prioritize LOW competition + HIGH intent keywords
- Include mix of head terms (1-2 words) and long-tail (3+ words)
- Focus on keywords with transactional or commercial intent when possible
- Ensure at least 3 keywords have difficulty < 30 for quick wins

## OUTPUT FORMAT
Return ONLY valid JSON array (no markdown, no explanation):
[{
  "keyword": "example keyword phrase",
  "search_volume": 1000,
  "keyword_difficulty": 45,
  "relevance_score": 90,
  "intent": "transactional",
  "opportunity_score": 85,
  "reasoning": "Brief explanation of why this keyword is valuable"
}]`,
        { model: "gemini-3-flash" as const, temperature: 0.5 },
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
        usageCount: 2,
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
    const charged = await this.consumeUsage("generate", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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
      usageCount: 10,
    };
  }

  // ============================================
  // SEO OPTIMIZATION
  // ============================================

  private async optimizeSEO(params: {
    articleId: string;
  }): Promise<AgentResult> {
    const charged = await this.consumeUsage("optimize", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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
        `You are an expert SEO analyst and content optimizer. Perform a comprehensive SEO audit of this article.

## ARTICLE TO ANALYZE
**Title:** ${article.title}
**Primary Keyword:** ${article.primary_keyword}
**Content Preview:** ${article.content.substring(0, 5000)}...

## ANALYSIS REQUIREMENTS

### 1. READABILITY ANALYSIS
- Calculate Flesch-Kincaid Reading Ease score (target: > 60 for easy reading)
- Assess sentence length (avg should be < 20 words)
- Check paragraph length (should be 2-4 sentences max)
- Evaluate use of transition words

### 2. KEYWORD OPTIMIZATION
- Calculate keyword density (target: 1-2% for primary keyword)
- Check keyword placement in:
  - Title (required)
  - First 100 words (required)
  - H2/H3 headings (recommended)
  - Meta description (required)
- Identify LSI (related) keyword usage

### 3. TECHNICAL SEO ELEMENTS
- Title tag optimization (max 60 chars, keyword at start)
- Meta description quality (max 155 chars, compelling CTA)
- Header structure (H1 -> H2 -> H3 hierarchy)
- Internal/external linking opportunities
- Image alt text recommendations

### 4. CONTENT QUALITY SIGNALS
- Content depth and comprehensiveness
- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trust)
- User intent satisfaction
- Unique value proposition

### 5. OPENGRAPH RECOMMENDATIONS
- Suggested OG title (max 60 chars)
- Suggested OG description (max 200 chars)
- Image concept for OG/social sharing

## SCORING RUBRIC
- 90-100: Excellent - Ready to publish
- 70-89: Good - Minor improvements needed
- 50-69: Fair - Significant improvements needed
- 0-49: Poor - Major rewrite required

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown):
{
  "seo_score": 75,
  "readability": {
    "flesch_score": 65,
    "avg_sentence_length": 18,
    "grade_level": "8th grade",
    "assessment": "Good readability for general audience"
  },
  "keyword_analysis": {
    "density_percent": 1.5,
    "in_title": true,
    "in_first_100_words": true,
    "in_headings": false,
    "missing_placements": ["H2 headings"]
  },
  "issues": [
    {"severity": "high", "issue": "...", "location": "..."},
    {"severity": "medium", "issue": "...", "location": "..."}
  ],
  "suggestions": [
    {"priority": 1, "suggestion": "...", "impact": "high"},
    {"priority": 2, "suggestion": "...", "impact": "medium"}
  ],
  "meta_title": "Optimized 60-char title with keyword",
  "meta_description": "Compelling 155-char description with CTA",
  "og_image_concept": "Description of ideal social sharing image"
}`,
        { model: "gemini-3-flash" as const, temperature: 0.3 },
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
        usageCount: 3,
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
    const charged = await this.consumeUsage("publish", 1);
    if (!charged) {
      return { success: false, error: "usage/limit_exceeded" };
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
      usageCount: 1,
    };
  }
}
