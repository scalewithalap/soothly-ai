import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import {
  getCMSAdapter,
  CMSConnection,
  CMSContent,
  CMSPlatform,
} from "@/lib/cms";
import type { SupabaseClient } from "@supabase/supabase-js";

const publishSchema = z.object({
  briefId: z.string().uuid(),
  platform: z.enum([
    "wordpress",
    "webflow",
    "ghost",
    "medium",
    "contentful",
  ] as const),
  status: z.enum(["draft", "published"]).default("draft"),
});

// POST /api/content/publish - Publish content brief to CMS
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Check subscription tier
  const { data: orgData } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", userData.org_id)
    .single();

  if (!orgData?.subscription_tier || orgData.subscription_tier === "free") {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Publishing to CMS requires a paid subscription",
      403
    );
  }

  // Validate request
  const { briefId, platform, status } = await validateBody(
    request,
    publishSchema
  );

  // Get content brief
  const { data: brief, error: briefError } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("id", briefId)
    .eq("org_id", userData.org_id)
    .single();

  if (briefError || !brief) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Content brief not found", 404);
  }

  // Get generated article content
  const { data: article } = await supabase
    .from("generated_articles")
    .select("content, excerpt")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!article?.content) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "No generated content found for this brief",
      400
    );
  }

  // Get CMS connection
  const { data: connectionData, error: connectionError } = await supabase
    .from("cms_connections")
    .select("*")
    .eq("org_id", userData.org_id)
    .eq("platform", platform)
    .eq("is_active", true)
    .single();

  if (connectionError || !connectionData) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      `No active ${platform} connection found. Configure it in Settings > CMS.`,
      404
    );
  }

  // Map database row to CMSConnection
  const connection: CMSConnection = {
    platform: connectionData.platform as CMSPlatform,
    siteUrl: connectionData.site_url,
    apiKey: connectionData.api_key,
    apiSecret: connectionData.api_secret,
    accessToken: connectionData.access_token,
    spaceId: connectionData.space_id,
    collectionId: connectionData.collection_id,
    databaseId: connectionData.database_id,
    isActive: connectionData.is_active,
    lastSync: connectionData.last_sync,
  };

  // Get adapter
  const adapter = getCMSAdapter(connection);

  if (!adapter) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `CMS adapter not available for ${platform}`,
      400
    );
  }

  // Build content object
  const cmsContent: CMSContent = {
    title: brief.title,
    content: article.content,
    excerpt: article.excerpt || brief.primary_keyword,
    slug: brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    status,
    tags: brief.primary_keyword ? [brief.primary_keyword] : [],
  };

  // Publish
  const result = await adapter.publish(cmsContent);

  if (!result.success) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      `Failed to publish: ${result.error}`,
      500
    );
  }

  // Update brief with publication info
  await supabase
    .from("content_briefs")
    .update({
      published_to: platform,
      published_url: result.postUrl,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", briefId);

  return apiSuccess({
    success: true,
    postId: result.postId,
    postUrl: result.postUrl,
    platform,
  });
});
