import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { CMS_PLATFORMS, CMSPlatform } from "@/lib/cms";
import type { SupabaseClient } from "@supabase/supabase-js";

const cmsConnectionSchema = z.object({
  platform: z.enum([
    "wordpress",
    "webflow",
    "ghost",
    "medium",
    "contentful",
    "strapi",
    "sanity",
    "notion",
    "hubspot",
    "squarespace",
  ] as const),
  siteUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  accessToken: z.string().optional(),
  spaceId: z.string().optional(),
  collectionId: z.string().optional(),
  databaseId: z.string().optional(),
});

// GET /api/settings/cms - Get CMS connections and available platforms
export const GET = withErrorHandler(async () => {
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

  // Check subscription tier (CMS is premium feature)
  const { data: orgData } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", userData.org_id)
    .single();

  const isPremium =
    orgData?.subscription_tier && !["free"].includes(orgData.subscription_tier);

  // Get existing connections
  const { data: connections } = await supabase
    .from("cms_connections")
    .select("*")
    .eq("org_id", userData.org_id);

  return apiSuccess({
    isPremium,
    availablePlatforms: Object.entries(CMS_PLATFORMS).map(([key, value]) => ({
      id: key,
      ...value,
    })),
    connections: connections || [],
  });
});

// POST /api/settings/cms - Create or update CMS connection
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
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Only admins and owners can manage CMS connections
  if (!["owner", "admin"].includes(userData.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403
    );
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
      "CMS integration requires a paid subscription",
      403
    );
  }

  // Validate request
  const data = await validateBody(request, cmsConnectionSchema);

  // Upsert connection
  const { data: connection, error } = await supabase
    .from("cms_connections")
    .upsert(
      {
        org_id: userData.org_id,
        platform: data.platform,
        site_url: data.siteUrl,
        api_key: data.apiKey,
        api_secret: data.apiSecret,
        access_token: data.accessToken,
        space_id: data.spaceId,
        collection_id: data.collectionId,
        database_id: data.databaseId,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "org_id,platform",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to save CMS connection:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to save connection",
      500
    );
  }

  return apiSuccess({ connection });
});

// DELETE /api/settings/cms - Remove CMS connection
export const DELETE = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  if (!["owner", "admin"].includes(userData.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403
    );
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") as CMSPlatform;

  if (!platform) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Platform required", 400);
  }

  const { error } = await supabase
    .from("cms_connections")
    .delete()
    .eq("org_id", userData.org_id)
    .eq("platform", platform);

  if (error) {
    console.error("Failed to delete CMS connection:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to delete connection",
      500
    );
  }

  return apiSuccess({ deleted: true });
});

