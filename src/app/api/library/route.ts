import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Query params schema
const QuerySchema = z.object({
  asset_type: z
    .enum(["upload", "report", "export", "generated", "scraped"])
    .optional(),
  source_agent: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: "auth/no_organization" },
        { status: 403 },
      );
    }

    const orgId = userData.org_id;

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = QuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "validation/invalid_params",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { asset_type, source_agent, search, limit, offset } =
      parseResult.data;

    // Build query
    let query = supabase
      .from("org_assets")
      .select(
        "id, name, description, asset_type, mime_type, size_bytes, storage_path, source_agent, tags, created_at",
        {
          count: "exact",
        },
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (asset_type) {
      query = query.eq("asset_type", asset_type);
    }

    if (source_agent) {
      query = query.eq("source_agent", source_agent);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: assets, count, error } = await query;

    if (error) {
      console.error("Library query error:", error);
      return NextResponse.json(
        { error: "internal/query_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      assets,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Library API error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: "auth/no_organization" },
        { status: 403 },
      );
    }

    const { assetId } = await request.json();

    if (!assetId) {
      return NextResponse.json(
        { error: "validation/missing_asset_id" },
        { status: 400 },
      );
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from("org_assets")
      .select("storage_path")
      .eq("id", assetId)
      .eq("org_id", userData.org_id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "not_found/asset" }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([asset.storage_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("org_assets")
      .delete()
      .eq("id", assetId);

    if (deleteError) {
      return NextResponse.json(
        { error: "internal/delete_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Library delete error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

