/**
 * Audit Logging Service
 *
 * Records user actions for compliance and security monitoring.
 */

import { createClient } from "@supabase/supabase-js";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "login"
  | "logout"
  | "invite"
  | "billing"
  | "webhook_test"
  | "trigger_executed";

export type EntityType =
  | "user"
  | "organization"
  | "agent_config"
  | "agent_task"
  | "subscription"
  | "team_member"
  | "knowledge_base"
  | "upload"
  | "notification"
  | "affiliate"
  | "affiliate_payout"
  | "webhook"
  | "webhook_trigger";

interface AuditLogEntry {
  orgId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("audit_log").insert({
    org_id: entry.orgId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    old_values: entry.oldValues,
    new_values: entry.newValues,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
  });

  if (error) {
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Get request context for audit logging
 */
export function getRequestContext(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Query audit log entries for an organization
 */
export async function getAuditLog(
  orgId: string,
  options: {
    limit?: number;
    offset?: number;
    entityType?: EntityType;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<{
  entries: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    userId: string | null;
    createdAt: string;
  }>;
  total: number;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(
      options.offset || 0,
      (options.offset || 0) + (options.limit || 50) - 1,
    );

  if (options.entityType) {
    query = query.eq("entity_type", options.entityType);
  }
  if (options.action) {
    query = query.eq("action", options.action);
  }
  if (options.startDate) {
    query = query.gte("created_at", options.startDate.toISOString());
  }
  if (options.endDate) {
    query = query.lte("created_at", options.endDate.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to fetch audit log:", error);
    return { entries: [], total: 0 };
  }

  return {
    entries: (data || []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      userId: entry.user_id,
      createdAt: entry.created_at,
    })),
    total: count || 0,
  };
}

const auditService = { logAuditEvent, getRequestContext, getAuditLog };

export default auditService;
