/**
 * GDPR Data Export API
 *
 * Allows users to export all their personal data.
 */

import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Fetch all user data
    const [
      userResult,
      orgResult,
      agentConfigsResult,
      agentTasksResult,
      messagesResult,
      notificationsResult,
      uploadsResult,
    ] = await Promise.all([
      // User profile
      supabase
        .from("users")
        .select("id, email, full_name, role, created_at, updated_at")
        .eq("id", authResult.id)
        .single(),

      // Organization
      supabase
        .from("organizations")
        .select("id, name, domain, industry, created_at")
        .eq("id", authResult.orgId)
        .single(),

      // Agent configurations
      supabase
        .from("agent_config")
        .select("id, agent_type, is_enabled, config, created_at")
        .eq("org_id", authResult.orgId),

      // Agent tasks
      supabase
        .from("agent_tasks")
        .select("id, agent_type, action, status, created_at, completed_at")
        .eq("org_id", authResult.orgId)
        .order("created_at", { ascending: false })
        .limit(100),

      // Messages
      supabase
        .from("agent_messages")
        .select("id, agent_type, role, content, created_at")
        .eq("org_id", authResult.orgId)
        .order("created_at", { ascending: false })
        .limit(500),

      // Notifications
      supabase
        .from("notifications")
        .select("id, type, title, message, read, created_at")
        .eq("user_id", authResult.id)
        .order("created_at", { ascending: false }),

      // Uploads
      supabase
        .from("uploaded_files")
        .select("id, filename, file_type, file_size, created_at")
        .eq("org_id", authResult.orgId),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: userResult.data,
      organization: orgResult.data,
      agentConfigurations: agentConfigsResult.data || [],
      agentTasks: agentTasksResult.data || [],
      messages: messagesResult.data || [],
      notifications: notificationsResult.data || [],
      uploads: uploadsResult.data || [],
    };

    // Log the export action
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "export",
      entityType: "user",
      entityId: authResult.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error("GDPR export error:", error);
    return NextResponse.json({ error: "gdpr/export_failed" }, { status: 500 });
  }
}

