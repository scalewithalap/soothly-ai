/**
 * Admin Affiliates API
 * List, approve, reject, and manage affiliates in the organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

type AnyClient = any;

const updateAffiliateSchema = z.object({
  affiliateId: z.string().uuid(),
  action: z.enum(["approve", "reject", "suspend", "reactivate"]).optional(),
  commission_rate: z.number().min(1).max(100).optional(),
});

const processPayoutSchema = z.object({
  payoutId: z.string().uuid(),
  action: z.enum(["process", "complete", "fail"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  }) as AnyClient;

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const includePayouts = searchParams.get("payouts") === "true";

  // Fetch affiliates
  let affiliatesQuery = supabase
    .from("affiliates")
    .select(
      `
      *,
      users:user_id (id, email, full_name)
    `,
    )
    .eq("org_id", authResult.orgId)
    .order("created_at", { ascending: false });

  if (status) {
    affiliatesQuery = affiliatesQuery.eq("status", status);
  }

  const { data: affiliates, error } = await affiliatesQuery;

  if (error) {
    console.error("Error fetching affiliates:", error);
    return NextResponse.json(
      { error: "admin/affiliates_fetch_failed" },
      { status: 500 },
    );
  }

  // Optionally fetch pending payouts
  let payouts = null;
  if (includePayouts) {
    const affiliateIds = affiliates?.map((a: { id: string }) => a.id) || [];
    if (affiliateIds.length > 0) {
      const { data: payoutsData } = await supabase
        .from("affiliate_payouts")
        .select(
          `
          *,
          affiliates:affiliate_id (referral_code, users:user_id (email, full_name))
        `,
        )
        .in("affiliate_id", affiliateIds)
        .in("status", ["requested", "processing"])
        .order("requested_at", { ascending: true });
      payouts = payoutsData;
    }
  }

  // Calculate summary stats
  const stats = {
    total: affiliates?.length || 0,
    pending:
      affiliates?.filter((a: { status: string }) => a.status === "pending")
        .length || 0,
    approved:
      affiliates?.filter((a: { status: string }) => a.status === "approved")
        .length || 0,
    totalEarned:
      affiliates?.reduce(
        (sum: number, a: { total_earned: number }) =>
          sum + (a.total_earned || 0),
        0,
      ) || 0,
    totalPaid:
      affiliates?.reduce(
        (sum: number, a: { total_paid: number }) => sum + (a.total_paid || 0),
        0,
      ) || 0,
    pendingPayouts:
      payouts?.reduce(
        (sum: number, p: { amount: number }) => sum + (p.amount || 0),
        0,
      ) || 0,
  };

  return NextResponse.json({ affiliates: affiliates || [], payouts, stats });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  }) as AnyClient;

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { affiliateId, action, commission_rate } =
      updateAffiliateSchema.parse(body);

    // Get current affiliate state for audit
    const { data: oldAffiliate } = await supabase
      .from("affiliates")
      .select("status, commission_rate")
      .eq("id", affiliateId)
      .eq("org_id", authResult.orgId)
      .single();

    if (!oldAffiliate) {
      return NextResponse.json(
        { error: "admin/affiliate_not_found" },
        { status: 404 },
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action) {
      switch (action) {
        case "approve":
          updates.status = "approved";
          updates.approved_at = new Date().toISOString();
          break;
        case "reject":
          updates.status = "rejected";
          break;
        case "suspend":
          updates.status = "suspended";
          break;
        case "reactivate":
          updates.status = "approved";
          break;
      }
    }

    if (commission_rate !== undefined) {
      updates.commission_rate = commission_rate;
    }

    const { error } = await supabase
      .from("affiliates")
      .update(updates)
      .eq("id", affiliateId)
      .eq("org_id", authResult.orgId);

    if (error) {
      console.error("Error updating affiliate:", error);
      return NextResponse.json(
        { error: "admin/update_failed" },
        { status: 500 },
      );
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "update",
      entityType: "affiliate",
      entityId: affiliateId,
      oldValues: oldAffiliate,
      newValues: updates,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Admin affiliate update error:", error);
    return NextResponse.json({ error: "admin/update_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  }) as AnyClient;

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { payoutId, action, reference, notes } =
      processPayoutSchema.parse(body);

    // Get payout details
    const { data: payout } = await supabase
      .from("affiliate_payouts")
      .select("*, affiliates:affiliate_id (org_id)")
      .eq("id", payoutId)
      .single();

    if (!payout || payout.affiliates?.org_id !== authResult.orgId) {
      return NextResponse.json(
        { error: "admin/payout_not_found" },
        { status: 404 },
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    switch (action) {
      case "process":
        updates.status = "processing";
        break;
      case "complete":
        updates.status = "completed";
        updates.processed_at = new Date().toISOString();
        updates.payment_reference = reference;
        // Update affiliate total_paid
        await supabase.rpc("complete_affiliate_payout", {
          p_payout_id: payoutId,
          p_reference: reference || "",
        });
        break;
      case "fail":
        updates.status = "failed";
        updates.notes = notes;
        // Refund the balance
        await supabase
          .from("affiliates")
          .update({
            pending_balance: supabase.sql`pending_balance + ${payout.amount}`,
          })
          .eq("id", payout.affiliate_id);
        break;
    }

    if (action !== "complete") {
      await supabase
        .from("affiliate_payouts")
        .update(updates)
        .eq("id", payoutId);
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      orgId: authResult.orgId,
      userId: authResult.id,
      action: "update",
      entityType: "affiliate_payout",
      entityId: payoutId,
      oldValues: { status: payout.status },
      newValues: updates,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Admin payout processing error:", error);
    return NextResponse.json({ error: "admin/payout_failed" }, { status: 500 });
  }
}

