/**
 * API Keys Management
 *
 * GET: List API keys
 * POST: Create new API key
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z
    .object({
      read: z.boolean(),
      write: z.boolean(),
    })
    .optional(),
  rateLimit: z.number().min(10).max(10000).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
});

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  // Check admin role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (!["admin", "owner"].includes(user?.role || "")) {
    return NextResponse.json(
      { error: "api_keys/unauthorized" },
      { status: 403 },
    );
  }

  const keys = await listApiKeys(authResult.orgId);

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  // Check admin role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (!["admin", "owner"].includes(user?.role || "")) {
    return NextResponse.json(
      { error: "api_keys/unauthorized" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { name, permissions, rateLimit, expiresInDays } =
      createKeySchema.parse(body);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const result = await createApiKey({
      orgId: authResult.orgId,
      name,
      permissions,
      rateLimit,
      expiresAt,
      createdBy: authResult.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "api_keys/create_failed" },
        { status: 500 },
      );
    }

    // Audit log
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "create",
      entityType: "user",
      entityId: result.data?.id,
      newValues: { name, permissions, rateLimit },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      key: result.key, // Only returned on creation
      data: result.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("API key creation error:", error);
    return NextResponse.json(
      { error: "api_keys/create_failed" },
      { status: 500 },
    );
  }
}

