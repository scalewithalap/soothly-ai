import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { updateCalendarItemSchema } from "@/lib/validation/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch content briefs for calendar view
export const GET = withErrorHandler(async (request: Request) => {
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

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM format

  // Calculate date range for month
  let startDate: string;
  let endDate: string;

  if (month) {
    const [year, monthNum] = month.split("-").map(Number);
    startDate = new Date(year, monthNum - 1, 1).toISOString().split("T")[0];
    endDate = new Date(year, monthNum, 0).toISOString().split("T")[0];
  } else {
    // Default to current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  }

  // Fetch content briefs
  const { data: briefs, error } = await supabase
    .from("content_briefs")
    .select("id, title, status, scheduled_date, calendar_position, created_at")
    .eq("org_id", userData.org_id)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("calendar_position", { ascending: true });

  if (error) {
    console.error("Failed to fetch briefs:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch content",
      500
    );
  }

  // Also get unscheduled briefs
  const { data: unscheduled } = await supabase
    .from("content_briefs")
    .select("id, title, status, created_at")
    .eq("org_id", userData.org_id)
    .is("scheduled_date", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return apiSuccess({
    briefs: briefs || [],
    unscheduled: unscheduled || [],
    dateRange: { startDate, endDate },
  });
});

// PATCH: Update scheduled date for a brief
export const PATCH = withErrorHandler(async (request: Request) => {
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

  // Validate request body
  const { briefId, scheduledDate, position } = await validateBody(
    request,
    updateCalendarItemSchema
  );

  // Update the brief
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (scheduledDate !== undefined) {
    updateData.scheduled_date = scheduledDate; // Can be null to unschedule
  }

  if (position !== undefined) {
    updateData.calendar_position = position;
  }

  const { data: updated, error } = await supabase
    .from("content_briefs")
    .update(updateData)
    .eq("id", briefId)
    .eq("org_id", userData.org_id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update brief:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update content",
      500
    );
  }

  return apiSuccess({ brief: updated });
});

