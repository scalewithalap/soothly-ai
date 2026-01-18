/**
 * Data Export API (GDPR Compliance)
 *
 * POST: Export all user data
 */

import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Get user profile
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", authResult.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "user/not_found" }, { status: 404 });
    }

    const orgId = user.org_id;

    // Gather all user data
    const exportData: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };

    // Get organization data
    if (orgId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, slug, metadata, created_at")
        .eq("id", orgId)
        .single();

      if (org) {
        exportData.organization = org;
      }
    }

    // Get notification settings
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", authResult.id)
      .single();

    if (notificationSettings) {
      exportData.notification_settings = {
        email_enabled: notificationSettings.email_enabled,
        push_enabled: notificationSettings.push_enabled,
        in_app_enabled: notificationSettings.in_app_enabled,
      };
    }

    // Get notifications (last 100)
    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, title, message, type, created_at, is_read")
      .eq("user_id", authResult.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (notifications) {
      exportData.notifications = notifications;
    }

    // Get credit transactions (if org exists)
    if (orgId) {
      const { data: creditTransactions } = await supabase
        .from("credit_transactions")
        .select("id, amount, type, description, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (creditTransactions) {
        exportData.credit_transactions = creditTransactions;
      }
    }

    // Get agent tasks (last 100)
    if (orgId) {
      const { data: agentTasks } = await supabase
        .from("agent_tasks")
        .select("id, agent_type, status, prompt, created_at, completed_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (agentTasks) {
        exportData.agent_tasks = agentTasks;
      }
    }

    // Get audit logs for this user
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("user_id", authResult.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (auditLogs) {
      exportData.audit_logs = auditLogs;
    }

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="zero-headache-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ error: "export/failed" }, { status: 500 });
  }
}

