"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Users,
  RefreshCw,
  Check,
  X,
  DollarSign,
  TrendingUp,
  Clock,
  Ban,
  Play,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  commission_rate: number;
  payment_method: string;
  total_referrals: number;
  total_conversions: number;
  total_earned: number;
  total_paid: number;
  pending_balance: number;
  created_at: string;
  approved_at: string | null;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_method: string;
  status: string;
  requested_at: string;
  affiliates: {
    referral_code: string;
    users: {
      email: string;
      full_name: string | null;
    };
  };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  totalEarned: number;
  totalPaid: number;
  pendingPayouts: number;
}

export default function AdminAffiliatesPage() {

  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [commissionDialog, setCommissionDialog] = useState<{
    open: boolean;
    affiliate: Affiliate | null;
    rate: number;
  }>({ open: false, affiliate: null, rate: 20 });
  const [payoutDialog, setPayoutDialog] = useState<{
    open: boolean;
    payout: Payout | null;
    action: "complete" | "fail";
    reference: string;
    notes: string;
  }>({
    open: false,
    payout: null,
    action: "complete",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/affiliates?payouts=true");
      if (res.ok) {
        const data = await res.json();
        setAffiliates(data.affiliates);
        setPayouts(data.payouts || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch affiliates:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAffiliate = async (
    affiliateId: string,
    action: "approve" | "reject" | "suspend" | "reactivate",
  ) => {
    setUpdating(affiliateId);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, action }),
      });

      if (res.ok) {
        await fetchData();
        toast.success(`Affiliate ${action}d successfully`);
      } else {
        toast.error(`Failed to ${action} affiliate`);
      }
    } catch {
      toast.error(`Failed to ${action} affiliate`);
    } finally {
      setUpdating(null);
    }
  };

  const updateCommissionRate = async () => {
    if (!commissionDialog.affiliate) return;
    setUpdating(commissionDialog.affiliate.id);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: commissionDialog.affiliate.id,
          commission_rate: commissionDialog.rate,
        }),
      });

      if (res.ok) {
        await fetchData();
        toast.success("Commission rate updated");
        setCommissionDialog({ open: false, affiliate: null, rate: 20 });
      } else {
        toast.error("Failed to update commission rate");
      }
    } catch {
      toast.error("Failed to update commission rate");
    } finally {
      setUpdating(null);
    }
  };

  const processPayout = async () => {
    if (!payoutDialog.payout) return;
    setUpdating(payoutDialog.payout.id);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId: payoutDialog.payout.id,
          action: payoutDialog.action,
          reference: payoutDialog.reference,
          notes: payoutDialog.notes,
        }),
      });

      if (res.ok) {
        await fetchData();
        toast.success(
          payoutDialog.action === "complete"
            ? "Payout completed"
            : "Payout marked as failed",
        );
        setPayoutDialog({
          open: false,
          payout: null,
          action: "complete",
          reference: "",
          notes: "",
        });
      } else {
        toast.error("Failed to process payout");
      }
    } catch {
      toast.error("Failed to process payout");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-600">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary">
            <Ban className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Affiliate Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage affiliate partners and payouts
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Affiliates
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalEarned)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Payouts
                  </p>
                  <p className="text-2xl font-bold text-[#9382FF]">
                    {formatCurrency(stats.pendingPayouts)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-[#9382FF]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="affiliates">
        <TabsList>
          <TabsTrigger value="affiliates">
            Affiliates ({affiliates.length})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Pending Payouts ({payouts.length})
          </TabsTrigger>
        </TabsList>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Affiliate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Referrals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {affiliates.map((affiliate) => (
                    <tr
                      key={affiliate.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {affiliate.users?.full_name || "No name"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {affiliate.users?.email}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              {affiliate.referral_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() =>
                                copyReferralLink(affiliate.referral_code)
                              }
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(affiliate.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p>
                            <span className="font-medium">
                              {affiliate.total_referrals}
                            </span>{" "}
                            clicks
                          </p>
                          <p>
                            <span className="font-medium text-green-600">
                              {affiliate.total_conversions}
                            </span>{" "}
                            conversions
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCommissionDialog({
                              open: true,
                              affiliate,
                              rate: affiliate.commission_rate,
                            })
                          }
                        >
                          {affiliate.commission_rate}%
                        </Button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p>
                            Earned:{" "}
                            <span className="font-medium">
                              {formatCurrency(affiliate.total_earned)}
                            </span>
                          </p>
                          <p>
                            Pending:{" "}
                            <span className="font-medium text-[#9382FF]">
                              {formatCurrency(affiliate.pending_balance)}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {affiliate.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() =>
                                  updateAffiliate(affiliate.id, "approve")
                                }
                                disabled={updating === affiliate.id}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  updateAffiliate(affiliate.id, "reject")
                                }
                                disabled={updating === affiliate.id}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {affiliate.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateAffiliate(affiliate.id, "suspend")
                              }
                              disabled={updating === affiliate.id}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          {affiliate.status === "suspended" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateAffiliate(affiliate.id, "reactivate")
                              }
                              disabled={updating === affiliate.id}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {affiliates.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No affiliates found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Affiliate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payout.affiliates?.users?.full_name || "No name"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payout.affiliates?.users?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4 capitalize">
                        {payout.payment_method.replace("_", " ")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(payout.requested_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            payout.status === "processing"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              setPayoutDialog({
                                open: true,
                                payout,
                                action: "complete",
                                reference: "",
                                notes: "",
                              })
                            }
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setPayoutDialog({
                                open: true,
                                payout,
                                action: "fail",
                                reference: "",
                                notes: "",
                              })
                            }
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No pending payouts
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Commission Rate Dialog */}
      <Dialog
        open={commissionDialog.open}
        onOpenChange={(open) =>
          setCommissionDialog({ ...commissionDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
            <DialogDescription>
              Set the commission rate for{" "}
              {commissionDialog.affiliate?.users?.full_name ||
                commissionDialog.affiliate?.users?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="commission_rate">Commission Rate (%)</Label>
            <Input
              id="commission_rate"
              type="number"
              min={1}
              max={100}
              value={commissionDialog.rate}
              onChange={(e) =>
                setCommissionDialog({
                  ...commissionDialog,
                  rate: Number(e.target.value),
                })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCommissionDialog({ open: false, affiliate: null, rate: 20 })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={updateCommissionRate}
              disabled={updating === commissionDialog.affiliate?.id}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Processing Dialog */}
      <Dialog
        open={payoutDialog.open}
        onOpenChange={(open) => setPayoutDialog({ ...payoutDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {payoutDialog.action === "complete"
                ? "Complete Payout"
                : "Fail Payout"}
            </DialogTitle>
            <DialogDescription>
              {payoutDialog.action === "complete"
                ? "Mark this payout as completed and enter the transaction reference."
                : "Mark this payout as failed. The amount will be refunded to the affiliate's balance."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {payoutDialog.action === "complete" ? (
              <div>
                <Label htmlFor="reference">Transaction Reference</Label>
                <Input
                  id="reference"
                  placeholder="e.g., PayPal transaction ID"
                  value={payoutDialog.reference}
                  onChange={(e) =>
                    setPayoutDialog({
                      ...payoutDialog,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="notes">Reason for Failure</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Invalid PayPal email"
                  value={payoutDialog.notes}
                  onChange={(e) =>
                    setPayoutDialog({ ...payoutDialog, notes: e.target.value })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPayoutDialog({
                  open: false,
                  payout: null,
                  action: "complete",
                  reference: "",
                  notes: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                payoutDialog.action === "complete" ? "default" : "destructive"
              }
              onClick={processPayout}
              disabled={updating === payoutDialog.payout?.id}
            >
              {payoutDialog.action === "complete"
                ? "Complete"
                : "Mark as Failed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

