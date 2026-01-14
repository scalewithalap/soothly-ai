import { createClient } from "@/lib/supabase/server";
import { LeadCampaignList } from "@/components/agents/leads/LeadCampaignList";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export default async function LeadsAgentPage() {
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

  // Fetch campaigns server-side
  const { data: campaigns } = await supabase
    .from("lead_campaigns")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  return <LeadCampaignList initialCampaigns={campaigns || []} />;
}
