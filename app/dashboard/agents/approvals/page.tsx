"use client";

import { ApprovalQueue } from "@/components/agents/approvals/ApprovalQueue";

/**
 * Approvals Page - Full approval queue interface
 * Displays all pending, approved, and rejected approval requests
 */
export default function ApprovalsPage() {
  return (
    <div className="p-6">
      <ApprovalQueue />
    </div>
  );
}
