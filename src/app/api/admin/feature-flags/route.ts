/**
 * Feature Flags Admin API
 *
 * GET: List all feature flags
 * POST: Create a new feature flag
 * PUT: Update a feature flag
 * DELETE: Delete a feature flag
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const createFlagSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z_]+$/),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  rollout_percentage: z.number().min(0).max(100).default(0),
  allowed_tiers: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

const updateFlagSchema = createFlagSchema.partial().extend({
  id: z.string().uuid(),
});

async function checkAdminRole(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return ["admin", "owner"].includes(user?.role || "");
}

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "feature_flags/unauthorized" },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: flags, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: "feature_flags/fetch_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ flags });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "feature_flags/unauthorized" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const data = createFlagSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: flag, error } = await supabase
      .from("feature_flags")
      .insert(data)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "feature_flags/duplicate_name" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "feature_flags/create_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ flag }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: err.issues },
        { status: 400 },
      );
    }
    throw err;
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "feature_flags/unauthorized" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { id, ...data } = updateFlagSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: flag, error } = await supabase
      .from("feature_flags")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "feature_flags/update_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ flag });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: err.issues },
        { status: 400 },
      );
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "feature_flags/unauthorized" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "validation/missing_id" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("feature_flags").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "feature_flags/delete_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
