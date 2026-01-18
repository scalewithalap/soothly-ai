import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root page - redirects based on authentication status
 * - Logged in: redirect to /dashboard
 * - Not logged in: redirect to /login
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

