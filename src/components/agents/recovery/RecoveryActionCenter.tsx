"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CreditCard,
  Mail,
  RefreshCwIcon,
  Ban,
  Clock,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Recovery } from "./RecoveryFeed";

/**
 * RecoveryActionCenter - Center Pane for Revenue Recovery Agent
 * Manage actions for a specific failed payment.
 */

interface RecoveryActionCenterProps {
  recovery?: Recovery;
  onRetry: () => void;
  onBlock: () => void;
  onSendEmail: (message: string) => void;
}

export function RecoveryActionCenter({
  recovery,
  onRetry,
  onBlock,
  onSendEmail,
}: RecoveryActionCenterProps) {
  const [activeTab, setActiveTab] = useState<"action" | "email">("action");
  const [customMessage, setCustomMessage] = useState("");

  if (!recovery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
        <CreditCard className="w-12 h-12 opacity-20" />
        <p>Select a failed payment to view recovery options</p>
      </div>
    );
  }

  const copyMagicLink = () => {
    navigator.clipboard.writeText(
      "https://app.zeroheadache.co/update-payment?token=...",
    );
    toast.success("Recovery link copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F10]">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
              {recovery.customerName}
              <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                {recovery.invoiceId} <ExternalLink className="w-3 h-3" />
              </span>
            </h1>
            <div className="flex items-center gap-4 text-sm">
              <Badge
                variant="outline"
                className="border-red-500/30 text-red-400 bg-red-500/5"
              >
                {recovery.failureCode}
              </Badge>
              <span className="text-gray-400">
                Due: {recovery.currency === "USD" ? "$" : recovery.currency}
                {recovery.amount.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onRetry}
              disabled={
                recovery.status === "recovered" || recovery.status === "failed"
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" /> Retry Charge
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Timeline / Action Toggle */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex gap-4 border-b border-white/10 mb-4">
            <button
              onClick={() => setActiveTab("action")}
              className={cn(
                "pb-2 px-1 text-sm font-medium transition-colors border-b-2",
                activeTab === "action"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-gray-500 hover:text-gray-300",
              )}
            >
              Overview & Actions
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={cn(
                "pb-2 px-1 text-sm font-medium transition-colors border-b-2",
                activeTab === "email"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-gray-500 hover:text-gray-300",
              )}
            >
              Communication
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-8 pb-8">
          {activeTab === "action" ? (
            <div className="space-y-6 max-w-2xl">
              {/* Status Card */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Recovery Timeline
                </h3>

                <div className="space-y-6 relative pl-4 border-l border-white/10 ml-2">
                  {/* Mock Timeline Items */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <div className="text-sm text-gray-300">
                      Payment Failed: {recovery.failureCode}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      2 days ago • Automated Attempt 1
                    </div>
                  </div>
                  {recovery.attempts > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-500" />
                      <div className="text-sm text-gray-300">
                        Recovery Email Sent
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        1 day ago • Smart Retries
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-white/20 border border-white/5" />
                    <div className="text-sm text-gray-500 font-medium">
                      Next Retry Scheduled
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Tomorrow at 9:00 AM
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Actions */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Manual Interventions
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Share Recovery Link
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Copy a magic link to send to the customer manually.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={copyMagicLink}
                      className="w-full"
                    >
                      <Copy className="w-3 h-3 mr-2" /> Copy Link
                    </Button>
                  </div>

                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg hover:border-red-500/20 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-red-400">
                      <Ban className="w-4 h-4" />
                      <span className="text-sm font-medium">Block Account</span>
                    </div>
                    <p className="text-xs text-red-200/50 mb-3">
                      Stop retries and restrict access immediately.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onBlock}
                      className="w-full"
                    >
                      Block User
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-4">
              <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wider">
                  AI Drafted Email
                </h4>
                <div className="text-sm text-gray-300 space-y-2 font-serif bg-black/20 p-4 rounded border border-white/5">
                  <p>Hi {recovery.customerName.split(" ")[0]},</p>
                  <p>
                    We noticed your payment of ${recovery.amount.toFixed(2)} was
                    declined due to {recovery.failureCode.replace("_", " ")}.
                  </p>
                  <p>
                    To avoid service interruption, please update your payment
                    method below:
                  </p>
                  <p className="text-blue-400">[Secure Payment Link]</p>
                  <p>
                    Best,
                    <br />
                    Zero Headache Team
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Add personal note (optional)
                </label>
                <Textarea
                  placeholder="Add a custom message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="bg-black/20 border-white/10 min-h-[100px]"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => onSendEmail(customMessage)}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <Mail className="w-4 h-4 mr-2" /> Send Email
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
