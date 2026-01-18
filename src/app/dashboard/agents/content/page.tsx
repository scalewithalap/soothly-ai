import { createClient } from "@/lib/supabase/server";
import { ContentCalendar } from "@/components/agents/content/ContentCalendar";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export default async function ContentAgentPage() {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's org
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    return (
      <div className="p-8 text-center text-gray-400">
        No organization found. Please contact support.
      </div>
    );
  }

  // Fetch briefs server-side
  const { data: briefs } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  return <ContentCalendar initialBriefs={briefs || []} />;
}

