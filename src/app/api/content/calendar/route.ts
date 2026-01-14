import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch content briefs for calendar view
export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
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
      .select(
        "id, title, status, scheduled_date, calendar_position, created_at"
      )
      .eq("org_id", userData.org_id)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("calendar_position", { ascending: true });

    if (error) {
      console.error("Failed to fetch briefs:", error);
      return NextResponse.json({ error: "db/query_failed" }, { status: 500 });
    }

    // Also get unscheduled briefs
    const { data: unscheduled } = await supabase
      .from("content_briefs")
      .select("id, title, status, created_at")
      .eq("org_id", userData.org_id)
      .is("scheduled_date", null)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      briefs: briefs || [],
      unscheduled: unscheduled || [],
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// PATCH: Update scheduled date for a brief
export async function PATCH(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    const body = await request.json();
    const { briefId, scheduledDate, position } = body;

    if (!briefId) {
      return NextResponse.json(
        { error: "validation/brief_id_required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "db/update_failed" }, { status: 500 });
    }

    return NextResponse.json({ brief: updated });
  } catch (error) {
    console.error("Calendar update error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
