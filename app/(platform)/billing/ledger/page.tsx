"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  TrendingDown,
} from "lucide-react";
import { AGENT_METADATA } from "@/lib/agents/base/types";

interface LedgerEntry {
  id: string;
  agent_type: string;
  action: string;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  agent_task_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface LedgerSummary {
  totalSpent: number;
  byAgent: Record<string, number>;
}

const AGENT_COLORS: Record<string, string> = {
  leads: "bg-blue-100 text-blue-800",
  content: "bg-green-100 text-green-800",
  partners: "bg-purple-100 text-purple-800",
  contracts: "bg-orange-100 text-orange-800",
  compliance: "bg-red-100 text-red-800",
  receivables: "bg-yellow-100 text-yellow-800",
  spend: "bg-pink-100 text-pink-800",
  pricing: "bg-cyan-100 text-cyan-800",
};

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalSpent: 0,
    byAgent: {},
  });
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const limit = 25;

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(page * limit));
      if (agentFilter) params.set("agent_type", agentFilter);

      const res = await fetch(`/api/billing/ledger?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setSummary(data.summary || { totalSpent: 0, byAgent: {} });
        setPagination(data.pagination || { total: 0, hasMore: false });
      }
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
    } finally {
      setLoading(false);
    }
  }, [page, agentFilter]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const exportCsv = () => {
    const headers = ["Date", "Agent", "Action", "Usage", "Balance After"];
    const rows = entries.map((e) => [
      new Date(e.created_at).toISOString(),
      e.agent_type,
      e.action,
      e.amount,
      e.balance_after,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Usage Ledger
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Complete history of all usage transactions across your agents.
          </p>
        </div>
        <Button
          onClick={exportCsv}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {Object.entries(summary.byAgent)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([agent, amount]) => (
            <Card key={agent} className="p-4">
              <div className="flex items-center gap-3">
                <Badge
                  className={AGENT_COLORS[agent] || "bg-gray-100 text-gray-800"}
                >
                  {AGENT_METADATA[agent as keyof typeof AGENT_METADATA]
                    ?.displayName || agent}
                </Badge>
                <p className="text-lg font-semibold text-gray-900 dark:text-white ml-auto">
                  {amount.toLocaleString()} used
                </p>
              </div>
            </Card>
          ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={agentFilter}
          onChange={(e) => {
            setAgentFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800"
        >
          <option value="">All Agents</option>
          {Object.entries(AGENT_METADATA).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No transactions yet
          </h3>
          <p className="text-sm text-gray-500">
            Usage data will appear here as agents complete tasks.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Usage
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Task
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={AGENT_COLORS[entry.agent_type] || ""}>
                      {AGENT_METADATA[
                        entry.agent_type as keyof typeof AGENT_METADATA
                      ]?.displayName || entry.agent_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white capitalize">
                    {entry.action}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      entry.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">
                    {entry.balance_after}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.agent_task_id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() =>
                          (window.location.href = `/agents?task=${entry.agent_task_id}`)
                        }
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pagination */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {page * limit + 1}–
            {Math.min((page + 1) * limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pagination.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
