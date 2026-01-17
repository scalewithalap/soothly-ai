/**
 * In-App Notifications Helper
 *
 * Creates notifications stored in the database for real-time display.
 */

import { createClient } from "@supabase/supabase-js";

export type InAppNotificationType =
  | "agent_completed"
  | "agent_failed"
  | "credit_low"
  | "credit_depleted"
  | "team_invite"
  | "subscription_renewed"
  | "subscription_expiring"
  | "system"
  | "announcement";

interface CreateInAppNotificationParams {
  userId: string;
  orgId: string;
  type: InAppNotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

/**
 * Create an in-app notification
 */
export async function createInAppNotification(
  params: CreateInAppNotificationParams,
): Promise<{ success: boolean; id?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      org_id: params.orgId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      action_url: params.actionUrl,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create in-app notification:", error);
    return { success: false };
  }

  return { success: true, id: data.id };
}

/**
 * Broadcast to all org users
 */
export async function broadcastToOrg(
  orgId: string,
  type: InAppNotificationType,
  title: string,
  message?: string,
): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", orgId);

  if (!users?.length) return 0;

  const notifications = users.map((u) => ({
    user_id: u.id,
    org_id: orgId,
    type,
    title,
    message,
  }));

  await supabase.from("notifications").insert(notifications);
  return users.length;
}
