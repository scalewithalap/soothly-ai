/**
 * Support Tickets API — the Customer Success agent's front door.
 *
 * POST /api/support/tickets — create a ticket and dispatch the agent.
 *   Phase 4b audit: NOTHING emitted support/ticket.created; the entire
 *   Customer Success workflow was unreachable. This route is the missing
 *   entry point, accepting either:
 *     a) Widget callers — Authorization: Bearer <widget session token>
 *        (token issued by POST /api/widget/verify, validated against
 *        widget_auth_sessions, org-scoped)
 *     b) Authenticated platform users (Supabase session) — e.g. testing from
 *        the dashboard
 *
 * GET /api/support/tickets — list recent tickets for the caller's org
 *   (platform auth only).
 *
 * Quota: support_messages is pre-checked here (requireAgentQuota) and
 * deducted on completion inside the workflow (ADR-008).
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { inngest } from "@/inngest/client";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { requireAgentQuota } from "@/lib/usage";
import type { SupabaseClient } from "@supabase/supabase-js";

const createTicketSchema = z.object({
  question: z.string().min(3).max(4000),
  subject: z.string().max(200).optional(),
  userEmail: z.string().email().optional(),
  userName: z.string().max(120).optional(),
  source: z.enum(["widget", "email", "api"]).default("widget"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function getAdminClient(): SupabaseClient {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  ) as unknown as SupabaseClient;
}

/**
 * Resolve the org for this request: widget bearer token first,
 * then platform session.
 */
async function resolveOrg(request: Request): Promise<{
  orgId: string;
  externalUserId?: string;
}> {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearer) {
    const admin = getAdminClient();
    const { data: session } = await admin
      .from("widget_auth_sessions")
      .select("org_id, external_user_id, expires_at")
      .eq("session_token", bearer)
      .single();
    if (!session || new Date(session.expires_at) < new Date()) {
      throw new AppError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        "Widget session invalid or expired",
        401,
      );
    }
    return { orgId: session.org_id, externalUserId: session.external_user_id };
  }

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }
  return { orgId: profile.org_id };
}

export const POST = withErrorHandler(async (request: Request) => {
  const { orgId, externalUserId } = await resolveOrg(request);
  const parsed = await validateBody(request, createTicketSchema);

  // Pre-check support_messages quota before dispatching the agent.
  await requireAgentQuota(orgId, "customer_success");

  const admin = getAdminClient();
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({
      org_id: orgId,
      question: parsed.question,
      subject: parsed.subject ?? null,
      user_email: parsed.userEmail ?? null,
      user_name: parsed.userName ?? null,
      source: parsed.source,
      status: "open",
      metadata: {
        ...(parsed.metadata ?? {}),
        ...(externalUserId ? { external_user_id: externalUserId } : {}),
      },
    })
    .select("id, created_at")
    .single();

  if (error || !ticket) {
    console.error("Ticket insert failed:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to create ticket",
      500,
    );
  }

  await inngest.send({
    name: "support/ticket.created",
    data: {
      ticketId: ticket.id,
      orgId,
      question: parsed.question,
      userEmail: parsed.userEmail ?? null,
    },
  });

  return apiSuccess({ ticket }, 201);
});

export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, question, status, intent, ai_confidence, source, created_at, resolved_at",
    )
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch tickets",
      500,
    );
  }
  return apiSuccess({ tickets });
});
