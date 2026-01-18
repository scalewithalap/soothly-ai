import { createClient } from "@/lib/supabase/server";
import { PartnerDiscovery } from "@/components/agents/partners/PartnerDiscovery";
import { redirect } from "next/navigation";

export default async function PartnersAgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <PartnerDiscovery />;
}

