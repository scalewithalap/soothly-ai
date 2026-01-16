import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { AppError, handleApiError } from "@/lib/errors";

// Query params schema
const QuerySchema = z.object({
  agent_type: z.string().optional(),
  action: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(["created_at", "amount"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
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

    const {
      agent_type,
      action,
      date_from,
      date_to,
      limit,
      offset,
      sort_by,
      sort_order,
    } = parseResult.data;

    // Build query
    let query = supabase
      .from("credit_ledger")
      .select(
        "id, agent_type, action, amount, balance_after, reference_id, reference_type, agent_task_id, metadata, created_at",
        { count: "exact" },
      )
      .eq("org_id", orgId)
      .order(sort_by, { ascending: sort_order === "asc" })
      .range(offset, offset + limit - 1);

    if (agent_type) {
      query = query.eq("agent_type", agent_type);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (date_from) {
      query = query.gte("created_at", date_from);
    }

    if (date_to) {
      query = query.lte("created_at", date_to);
    }

    const { data: entries, count, error } = await query;

    if (error) {
      throw AppError.databaseError("Failed to query ledger");
    }

    // Get summary stats for the period
    let summaryQuery = supabase
      .from("credit_ledger")
      .select("agent_type, amount")
      .eq("org_id", orgId)
      .lt("amount", 0); // Only deductions

    if (date_from) {
      summaryQuery = summaryQuery.gte("created_at", date_from);
    }

    if (date_to) {
      summaryQuery = summaryQuery.lte("created_at", date_to);
    }

    const { data: summaryData } = await summaryQuery;

    // Calculate summary by agent
    const byAgent: Record<string, number> = {};
    let totalSpent = 0;

    summaryData?.forEach((entry) => {
      const absAmount = Math.abs(entry.amount);
      totalSpent += absAmount;
      byAgent[entry.agent_type] = (byAgent[entry.agent_type] || 0) + absAmount;
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
        totalSpent,
        byAgent,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
