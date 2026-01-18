/**
 * ApprovalGate - Human-in-the-loop approval system for agent actions
 * Manages approval requests, notifications, and auto-approval policies
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { untypedQuery } from "../utils/dbUtils";
import {
  type ApprovalRequest,
  type ApprovalStatus,
  type CreateApprovalInput,
  type ApprovalListOptions,
  type ApprovalResolutionInput,
  type RiskLevel,
  RISK_THRESHOLDS,
} from "./types";

export class ApprovalGate {
  private db: SupabaseClient<Database>;
  private orgId: string;

  constructor(db: SupabaseClient<Database>, orgId: string) {
    this.db = db;
    this.orgId = orgId;
  }

  /**
   * Request approval for an action
   * Returns the approval request ID to poll for status
   */
  async requestApproval(input: CreateApprovalInput): Promise<ApprovalRequest> {
    const riskConfig = RISK_THRESHOLDS[input.risk_level];

    // Calculate expiration based on risk level
    const expiresAt = input.expires_in_ms
      ? new Date(Date.now() + input.expires_in_ms)
      : riskConfig.timeout_ms > 0
        ? new Date(Date.now() + riskConfig.timeout_ms)
        : null;

    // Check for auto-approval based on risk level
    const status: ApprovalStatus = riskConfig.auto_approve
      ? "auto_approved"
      : "pending";

    const { data, error } = await untypedQuery(this.db)
      .from("approval_requests")
      .insert({
        org_id: this.orgId,
        agent_type: input.agent_type,
        action: input.action,
        title: input.title,
        description: input.description,
        params: input.params,
        preview_data: input.preview_data,
        risk_level: input.risk_level,
        risk_factors: input.risk_factors || [],
        status,
        workflow_run_id: input.workflow_run_id,
        requested_by: input.requested_by,
        assigned_to: input.assigned_to,
        expires_at: expiresAt?.toISOString(),
        auto_approve_after: input.auto_approve_after_ms
          ? `${input.auto_approve_after_ms} milliseconds`
          : null,
        resolution_at:
          status === "auto_approved" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create approval request: ${error.message}`);
    }

    const request = data as unknown as ApprovalRequest;

    // Send notification if high/critical risk
    if (riskConfig.notify && status === "pending") {
      await this.notifyApprovers(request);
    }

    return request;
  }

  /**
   * Get an approval request by ID
   */
  async getRequest(requestId: string): Promise<ApprovalRequest | null> {
    const { data, error } = await untypedQuery(this.db)
      .from("approval_requests")
      .select("*")
      .eq("id", requestId)
      .eq("org_id", this.orgId)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as ApprovalRequest;
  }

  /**
   * Wait for approval with polling
   * Returns true if approved, false if rejected/expired
   */
  async waitForApproval(
    requestId: string,
    timeoutMs: number = 3600000,
    pollIntervalMs: number = 5000,
  ): Promise<{ approved: boolean; request: ApprovalRequest | null }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const request = await this.getRequest(requestId);

      if (!request) {
        return { approved: false, request: null };
      }

      // Check for resolution
      switch (request.status) {
        case "approved":
        case "auto_approved":
          return { approved: true, request };
        case "rejected":
        case "auto_rejected":
        case "expired":
          return { approved: false, request };
        case "pending":
          // Check if expired
          if (request.expires_at && new Date(request.expires_at) < new Date()) {
            await this.expireRequest(requestId);
            return {
              approved: false,
              request: { ...request, status: "expired" },
            };
          }
          // Continue polling
          await this.sleep(pollIntervalMs);
          break;
      }
    }

    // Timeout reached
    return { approved: false, request: await this.getRequest(requestId) };
  }

  /**
   * Resolve an approval request (approve or reject)
   */
  async resolve(
    requestId: string,
    resolution: ApprovalResolutionInput,
  ): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("approval_requests")
      .update({
        status: resolution.status,
        approved_by: resolution.approved_by,
        resolution_comment: resolution.comment,
        resolution_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("org_id", this.orgId)
      .eq("status", "pending"); // Only update pending requests

    if (error) {
      console.error("Failed to resolve approval:", error);
      return false;
    }

    return true;
  }

  /**
   * Approve a request (convenience method)
   */
  async approve(
    requestId: string,
    approvedBy: string,
    comment?: string,
  ): Promise<boolean> {
    return this.resolve(requestId, {
      status: "approved",
      approved_by: approvedBy,
      comment,
    });
  }

  /**
   * Reject a request (convenience method)
   */
  async reject(
    requestId: string,
    rejectedBy: string,
    comment?: string,
  ): Promise<boolean> {
    return this.resolve(requestId, {
      status: "rejected",
      approved_by: rejectedBy,
      comment,
    });
  }

  /**
   * Mark a request as expired
   */
  private async expireRequest(requestId: string): Promise<void> {
    await untypedQuery(this.db)
      .from("approval_requests")
      .update({
        status: "expired",
        resolution_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending");
  }

  /**
   * List approval requests
   */
  async list(options: ApprovalListOptions = {}): Promise<ApprovalRequest[]> {
    const {
      statuses,
      agent_types,
      risk_levels,
      assigned_to,
      limit = 50,
      offset = 0,
    } = options;

    let query = untypedQuery(this.db)
      .from("approval_requests")
      .select("*")
      .eq("org_id", this.orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statuses?.length) {
      query = query.in("status", statuses);
    }

    if (agent_types?.length) {
      query = query.in("agent_type", agent_types);
    }

    if (risk_levels?.length) {
      query = query.in("risk_level", risk_levels);
    }

    if (assigned_to) {
      query = query.eq("assigned_to", assigned_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to list approvals:", error);
      return [];
    }

    return (data as unknown as ApprovalRequest[]) || [];
  }

  /**
   * Get pending approvals count
   */
  async getPendingCount(): Promise<number> {
    const { count, error } = await untypedQuery(this.db)
      .from("approval_requests")
      .select("*", { count: "exact", head: true })
      .eq("org_id", this.orgId)
      .eq("status", "pending");

    if (error) {
      return 0;
    }

    return count || 0;
  }

  /**
   * Get pending approvals for a specific user
   */
  async getPendingForUser(userId: string): Promise<ApprovalRequest[]> {
    return this.list({
      statuses: ["pending"],
      assigned_to: userId,
    });
  }

  /**
   * Cancel a pending approval request
   */
  async cancel(requestId: string): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("approval_requests")
      .delete()
      .eq("id", requestId)
      .eq("org_id", this.orgId)
      .eq("status", "pending");

    return !error;
  }

  /**
   * Send notifications to approvers
   */
  private async notifyApprovers(request: ApprovalRequest): Promise<void> {
    // TODO: Integrate with notification system
    // This would send push notifications, emails, or in-app notifications
    console.log(`[HITL] Approval required: ${request.title}`);
    console.log(`[HITL] Risk level: ${request.risk_level}`);
    console.log(`[HITL] Request ID: ${request.id}`);

    // If assigned to a specific user, notify them
    if (request.assigned_to) {
      // await notifyUser(request.assigned_to, { ... });
    }
  }

  /**
   * Process expired approvals (should be called periodically)
   */
  async processExpired(): Promise<number> {
    const { data, error } = await untypedQuery(this.db)
      .from("approval_requests")
      .update({
        status: "expired",
        resolution_at: new Date().toISOString(),
      })
      .eq("org_id", this.orgId)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      console.error("Failed to process expired approvals:", error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get approval statistics
   */
  async getStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    by_status: Record<ApprovalStatus, number>;
    by_risk: Record<RiskLevel, number>;
    avg_resolution_time_ms: number;
  }> {
    let query = untypedQuery(this.db)
      .from("approval_requests")
      .select("status, risk_level, created_at, resolution_at")
      .eq("org_id", this.orgId);

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        total: 0,
        by_status: {
          pending: 0,
          approved: 0,
          rejected: 0,
          auto_approved: 0,
          auto_rejected: 0,
          expired: 0,
        },
        by_risk: { low: 0, medium: 0, high: 0, critical: 0 },
        avg_resolution_time_ms: 0,
      };
    }

    const by_status: Record<ApprovalStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      auto_approved: 0,
      auto_rejected: 0,
      expired: 0,
    };

    const by_risk: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const row of data) {
      const r = row as {
        status: ApprovalStatus;
        risk_level: RiskLevel;
        created_at: string;
        resolution_at: string | null;
      };
      by_status[r.status]++;
      by_risk[r.risk_level]++;

      if (r.resolution_at) {
        const created = new Date(r.created_at).getTime();
        const resolved = new Date(r.resolution_at).getTime();
        totalResolutionTime += resolved - created;
        resolvedCount++;
      }
    }

    return {
      total: data.length,
      by_status,
      by_risk,
      avg_resolution_time_ms:
        resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    };
  }
}

