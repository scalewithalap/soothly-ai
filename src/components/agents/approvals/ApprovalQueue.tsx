"use client";

import { useState, useEffect } from "react";
import { useContent } from "@/hooks/use-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  ApprovalRequest,
  ApprovalStatus,
  RiskLevel,
} from "@/agents/hitl/types";

export function ApprovalQueue() {
  const { content } = useContent();
  const t = content.agentPlatform.approvals as any;
  const common = content.agentPlatform.common as any;

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<ApprovalStatus | "all">("pending");

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/approvals");
      if (!res.ok) throw new Error("Failed to fetch approvals");
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error("Error fetching approvals:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) throw new Error("Failed to approve");

      toast.success(t.toasts.approved);
      fetchApprovals();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setIsProcessing(true);
      const res = await fetch(`/api/approvals/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          comment: rejectComment,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject");

      toast.success(t.toasts.rejected);
      setRejectComment("");
      setSelectedRequest(null);
      fetchApprovals();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredApprovals = approvals.filter((req) =>
    activeTab === "all" ? true : req.status === activeTab,
  );

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500">
            {t.riskLevel.low}
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="text-yellow-500 border-yellow-500"
          >
            {t.riskLevel.medium}
          </Badge>
        );
      case "high":
        return (
          <Badge
            variant="outline"
            className="text-orange-500 border-orange-500"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t.riskLevel.high}
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive">
            <ShieldAlert className="w-3 h-3 mr-1" />
            {t.riskLevel.critical}
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
          >
            {t.pending}
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="secondary"
            className="bg-green-500/10 text-green-500 hover:bg-green-500/20"
          >
            {t.approved}
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="secondary"
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            {t.rejected}
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="secondary"
            className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
          >
            {t.expired}
          </Badge>
        );
      case "auto_approved":
        return (
          <Badge
            variant="secondary"
            className="bg-green-500/10 text-green-500 hover:bg-green-500/20"
          >
            Auto {t.approved}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      <Tabs
        defaultValue="pending"
        className="w-full"
        onValueChange={(v) => setActiveTab(v as any)}
      >
        <TabsList>
          <TabsTrigger value="pending">{t.pending}</TabsTrigger>
          <TabsTrigger value="approved">{t.approved}</TabsTrigger>
          <TabsTrigger value="rejected">{t.rejected}</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t.empty}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t.emptyDesc}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredApprovals.map((req) => (
                <Card key={req.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold leading-none">
                          {req.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {req.agent_type.toUpperCase()} • {req.action}
                        </CardDescription>
                      </div>
                      {getRiskBadge(req.risk_level)}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    {req.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {req.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">
                          {t.requestedBy}
                        </span>
                        <span className="font-medium">
                          {req.requested_by || "System"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(req.status)}
                      </div>
                      {req.expires_at && req.status === "pending" && (
                        <div className="flex justify-between py-1 text-orange-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {t.expiresIn}
                          </span>
                          <span className="font-medium">
                            {formatDistanceToNow(new Date(req.expires_at), {
                              addSuffix: false,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preview Data Snippet */}
                    {req.preview_data && (
                      <div className="mt-4 p-2 bg-muted/50 rounded text-xs font-mono overflow-hidden">
                        <pre>
                          {JSON.stringify(req.preview_data, null, 2).slice(
                            0,
                            100,
                          )}
                          ...
                        </pre>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-3 border-t bg-muted/20">
                    {req.status === "pending" ? (
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-900/20"
                          onClick={() => setSelectedRequest(req)}
                          disabled={isProcessing}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {t.reject}
                        </Button>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(req.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          {t.approve}
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full text-center text-sm text-muted-foreground flex justify-between items-center">
                        <span>Resolved by {req.approved_by || "System"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs ml-auto"
                        >
                          {common.viewDetails}{" "}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reject}</DialogTitle>
            <DialogDescription>{t.commentPlaceholder}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder={t.commentPlaceholder}
              className="resize-none"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>
              {common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {t.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
