"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useContent } from "@/hooks/use-content";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const { content } = useContent();
  const admin = content.admin;
  const t = admin.auditLogPage || {};
  const headers = t.tableHeaders || {};
  const pagination = t.pagination || {};

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    fetchAuditLog();
  }, [offset]);

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/audit-log?limit=${limit}&offset=${offset}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch audit log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      update:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      view: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      export:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      login:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${colors[action] || colors.view}`}
      >
        {action}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ScrollText className="w-6 h-6" />
            {t.title || admin.auditLog || "Audit Log"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {total} {t.totalEntries || "total entries"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchAuditLog} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {t.refresh || admin.refresh || "Refresh"}
        </Button>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {headers.time || "Time"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {headers.action || "Action"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {headers.entity || "Entity"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {headers.entityId || "Entity ID"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {getActionBadge(entry.action)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {entry.entityType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {entry.entityId?.slice(0, 8) || "—"}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        {t.emptyState || "No audit entries found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pagination.page || "Page"} {currentPage}{" "}
                  {pagination.of || "of"} {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

