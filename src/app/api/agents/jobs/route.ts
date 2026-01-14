import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch recent agent jobs/activities
export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // running, completed, failed
    const limit = parseInt(searchParams.get("limit") || "20");

    // Fetch recent activities
    let query = supabase
      .from("activities")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error("Failed to fetch activities:", error);
      return NextResponse.json({ error: "db/query_failed" }, { status: 500 });
    }

    // Count by status for summary
    const { data: statusCounts } = await supabase
      .from("activities")
      .select("status")
      .eq("org_id", userData.org_id);

    const summary = {
      total: statusCounts?.length || 0,
      running: statusCounts?.filter((a) => a.status === "running").length || 0,
      completed:
        statusCounts?.filter((a) => a.status === "completed").length || 0,
      failed: statusCounts?.filter((a) => a.status === "failed").length || 0,
    };

    return NextResponse.json({
      activities: activities || [],
      summary,
    });
  } catch (error) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
