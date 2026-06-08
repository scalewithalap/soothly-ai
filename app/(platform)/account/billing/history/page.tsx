"use client";

/**
 * Billing History Page
 *
 * Display user's payment and subscription history.
 */

import { useState, useEffect, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Download, RefreshCw, CreditCard } from "lucide-react";
import { LanguageContext } from "@/context/language-context";

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  description: string;
  invoice_url?: string;
}

export default function BillingHistoryPage() {
  const ctx = useContext(LanguageContext);
  const t = ((ctx?.content as any)?.billingHistory || {}) as Record<
    string,
    string
  >;

  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/billing/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch billing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: BillingRecord["status"]) => {
    const variants: Record<
      string,
      "success" | "warning" | "error" | "default"
    > = {
      paid: "success",
      pending: "warning",
      failed: "error",
      refunded: "default",
    };
    return variants[status] || "default";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            {t.title || "Billing History"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.description || "View your payment and subscription history"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchHistory} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No billing history yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Your payment and subscription records will appear here
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-gray-200 dark:divide-gray-700">
          {history.map((record) => (
            <div
              key={record.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#9382FF]/20 dark:bg-[#9382FF]/30 rounded-full flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[#9382FF]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {record.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(record.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(record.amount, record.currency)}
                  </p>
                  <Badge variant={getStatusBadge(record.status)} size="sm">
                    {record.status}
                  </Badge>
                </div>
                {record.invoice_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={record.invoice_url} target="_blank" rel="noopener">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

