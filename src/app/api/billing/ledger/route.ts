/**
 * Usage Ledger API Route
 *
 * @route GET /api/billing/ledger
 * @description Get organization's usage history by feature
 *
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { AppError, handleApiError } from "@/lib/errors";

// Query params schema
const QuerySchema = z.object({
  feature_key: z.string().optional(),
  period_start: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Use RBAC middleware
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const { orgId } = authResult;
    const supabase = await createClient();

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = QuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return AppError.invalidInput({
        issues: parseResult.error.issues,
      }).toResponse();
    }

    const { feature_key, period_start, limit, offset } = parseResult.data;

    // Build query for org_usage table
    let query = supabase
      .from("org_usage")
      .select("*", { count: "exact" })
      .eq("org_id", orgId)
      .order("period_start", { ascending: false })
      .range(offset, offset + limit - 1);

    if (feature_key) {
      query = query.eq("feature_key", feature_key);
    }

    if (period_start) {
      query = query.eq("period_start", period_start);
    }

    const { data: entries, count, error } = await query;

    if (error) {
      throw AppError.databaseError("Failed to query usage ledger");
    }

    // Get summary by feature for current period
    const currentPeriod = new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01
    const { data: summaryData } = await supabase
      .from("org_usage")
      .select("feature_key, current_count")
      .eq("org_id", orgId)
      .eq("period_start", currentPeriod);

    const byFeature: Record<string, number> = {};
    let totalUsed = 0;

    summaryData?.forEach((entry) => {
      totalUsed += entry.current_count ?? 0;
      byFeature[entry.feature_key] = entry.current_count ?? 0;
    });

    return NextResponse.json({
      entries,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      summary: {
        totalUsed,
        byFeature,
        currentPeriod,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
