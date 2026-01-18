/**
 * HITL (Human-in-the-Loop) Types
 * Approval gates and intervention points for agent actions
 */

import type { AgentType } from "../base/types";

/**
 * Risk levels for approval requests
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Approval request status
 */
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved"
  | "auto_rejected"
  | "expired";

/**
 * An approval request record
 */
export interface ApprovalRequest {
  id: string;
  org_id: string;

  // Source context
  workflow_run_id?: string;
  agent_type: AgentType;
  action: string;

  // Request details
  title: string;
  description?: string;
  params: Record<string, unknown>;
  preview_data?: Record<string, unknown>;

  // Risk assessment
  risk_level: RiskLevel;
  risk_factors: string[];

  // Approval status
  status: ApprovalStatus;

  // Routing
  requested_by?: string;
  assigned_to?: string;
  approved_by?: string;

  // Resolution
  resolution_comment?: string;
  resolution_at?: Date;

  // Timing
  created_at: Date;
  expires_at?: Date;

  // Auto-approval
  auto_approve_after?: number; // milliseconds
  auto_approval_policy?: string;
}

/**
 * Input for creating an approval request
 */
export interface CreateApprovalInput {
  agent_type: AgentType;
  action: string;
  title: string;
  description?: string;
  params: Record<string, unknown>;
  preview_data?: Record<string, unknown>;
  risk_level: RiskLevel;
  risk_factors?: string[];
  workflow_run_id?: string;
  requested_by?: string;
  assigned_to?: string;
  expires_in_ms?: number;
  auto_approve_after_ms?: number;
}

/**
 * Options for listing approval requests
 */
export interface ApprovalListOptions {
  statuses?: ApprovalStatus[];
  agent_types?: AgentType[];
  risk_levels?: RiskLevel[];
  assigned_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Approval resolution input
 */
export interface ApprovalResolutionInput {
  status: "approved" | "rejected";
  comment?: string;
  approved_by: string;
}

/**
 * Auto-approval policy configuration
 */
export interface AutoApprovalPolicy {
  id: string;
  name: string;
  enabled: boolean;

  // Conditions for auto-approval
  max_risk_level: RiskLevel;
  agent_types?: AgentType[];
  actions?: string[];

  // Timing
  auto_approve_after_ms: number;

  // Constraints
  max_daily_approvals?: number;
  require_business_hours?: boolean;
}

/**
 * Default risk thresholds
 */
export const RISK_THRESHOLDS = {
  low: {
    auto_approve: true,
    timeout_ms: 0,
    notify: false,
  },
  medium: {
    auto_approve: false,
    timeout_ms: 3600000, // 1 hour
    notify: false,
  },
  high: {
    auto_approve: false,
    timeout_ms: 86400000, // 24 hours
    notify: true,
  },
  critical: {
    auto_approve: false,
    timeout_ms: 604800000, // 7 days
    notify: true,
  },
};

