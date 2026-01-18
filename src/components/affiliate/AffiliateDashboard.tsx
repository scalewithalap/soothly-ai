"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Check,
} from "lucide-react";
import { useContent } from "@/hooks/use-content";

interface Affiliate {
  id: string;
  referral_code: string;
  status: string;
  commission_rate: number;
  total_referrals: number;
  total_conversions: number;
  total_earned: number;
  pending_balance: number;
  total_paid: number;
  created_at: string;
}

interface Referral {
  id: string;
  status: string;
  landing_page: string;
  created_at: string;
  users?: { email: string };
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  requested_at: string;
  processed_at?: string;
}

export function AffiliateDashboard() {
  const { content } = useContent();
  const t = content.affiliate as any;

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/affiliates?mode=me");
      const data = await res.json();

      if (data.affiliate) {
        setAffiliate(data.affiliate);
        // Fetch referrals and payouts
        await Promise.all([
          fetchReferrals(data.affiliate.id),
          fetchPayouts(data.affiliate.id),
        ]);
      }
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      toast.error(t?.errors?.loadFailed || "Failed to load affiliate data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReferrals = async (affiliateId: string) => {
    try {
      const res = await fetch(`/api/affiliates/${affiliateId}/referrals`);
      const data = await res.json();
      setReferrals(data.referrals || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const fetchPayouts = async (affiliateId: string) => {
    try {
      const res = await fetch(`/api/affiliates/${affiliateId}/payouts`);
      const data = await res.json();
      setPayouts(data.payouts || []);
    } catch (error) {
      console.error("Error fetching payouts:", error);
    }
  };

  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(t?.linkCopied || "Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const requestPayout = async () => {
    if (!affiliate || affiliate.pending_balance < 50) {
      toast.error(t?.errors?.minPayout || "Minimum payout is $50");
      return;
    }

    try {
      const res = await fetch(`/api/affiliates/${affiliate.id}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: affiliate.pending_balance,
          payment_method: "paypal",
        }),
      });

      if (!res.ok) throw new Error("Failed to request payout");

      toast.success(t?.payoutRequested || "Payout requested successfully");
      fetchAffiliateData();
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast.error(t?.errors?.payoutFailed || "Failed to request payout");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t?.notAffiliate?.title || "Not an Affiliate Yet"}
          </h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {t?.notAffiliate?.description ||
              "Join our affiliate program to earn commissions by referring customers."}
          </p>
          <Button asChild>
            <a href="/affiliate/apply">{t?.notAffiliate?.cta || "Apply Now"}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}?ref=${affiliate.referral_code}`;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {affiliate.status === "pending" && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="py-4">
            <p className="text-amber-600 dark:text-amber-400">
              {t?.pendingApproval ||
                "Your affiliate application is pending approval. You'll be notified once approved."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t?.stats?.referrals || "Total Referrals"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliate.total_referrals}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t?.stats?.conversions || "Conversions"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliate.total_conversions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t?.stats?.earned || "Total Earned"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${affiliate.total_earned.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t?.stats?.pending || "Pending Balance"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${affiliate.pending_balance.toFixed(2)}
            </div>
            {affiliate.pending_balance >= 50 && (
              <Button size="sm" className="mt-2" onClick={requestPayout}>
                {t?.requestPayout || "Request Payout"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t?.referralLink?.title || "Your Referral Link"}
          </CardTitle>
          <CardDescription>
            {t?.referralLink?.description ||
              "Share this link to earn commissions on referrals"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyReferralLink}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {t?.commissionRate || "Commission rate"}:{" "}
            {affiliate.commission_rate}%
          </p>
        </CardContent>
      </Card>

      {/* Tabs for Referrals and Payouts */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">
            {t?.tabs?.referrals || "Referrals"}
          </TabsTrigger>
          <TabsTrigger value="payouts">
            {t?.tabs?.payouts || "Payouts"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>{t?.referrals?.title || "Recent Referrals"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t?.referrals?.date || "Date"}</TableHead>
                    <TableHead>{t?.referrals?.status || "Status"}</TableHead>
                    <TableHead>
                      {t?.referrals?.page || "Landing Page"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        {t?.referrals?.empty || "No referrals yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell>
                          {new Date(ref.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ref.status === "converted"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {ref.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ref.landing_page || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>{t?.payouts?.title || "Payout History"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t?.payouts?.date || "Date"}</TableHead>
                    <TableHead>{t?.payouts?.amount || "Amount"}</TableHead>
                    <TableHead>{t?.payouts?.method || "Method"}</TableHead>
                    <TableHead>{t?.payouts?.status || "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        {t?.payouts?.empty || "No payouts yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          {new Date(payout.requested_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>${payout.amount.toFixed(2)}</TableCell>
                        <TableCell className="capitalize">
                          {payout.payment_method}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payout.status === "completed"
                                ? "default"
                                : payout.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

