"use client";

import { useEffect, useState, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tag,
  Plus,
  RefreshCw,
  Percent,
  DollarSign,
  Zap,
  X,
} from "lucide-react";
import { LanguageContext } from "@/context/language-context";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  applies_to: string[];
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminCouponsPage() {
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.coupons || {}) as Record<string, string>;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed" | "credits">(
    "percentage",
  );
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validDays, setValidDays] = useState("");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    if (!code || !value) {
      toast.error("Code and value are required");
      return;
    }

    setCreating(true);
    try {
      const validUntil = validDays
        ? new Date(
            Date.now() + parseInt(validDays) * 24 * 60 * 60 * 1000,
          ).toISOString()
        : undefined;

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type,
          value: parseFloat(value),
          appliesTo: ["subscription", "credits"],
          maxUses: maxUses ? parseInt(maxUses) : undefined,
          validUntil,
        }),
      });

      if (res.ok) {
        toast.success("Coupon created successfully");
        setShowForm(false);
        setCode("");
        setValue("");
        setMaxUses("");
        setValidDays("");
        fetchCoupons();
      } else {
        const data = await res.json();
        toast.error(
          data.error === "coupons/code_exists"
            ? "Code already exists"
            : "Failed to create coupon",
        );
      }
    } catch {
      toast.error("Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <Percent className="w-4 h-4" />;
      case "fixed":
        return <DollarSign className="w-4 h-4" />;
      case "credits":
        return <Zap className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const formatValue = (coupon: Coupon) => {
    if (coupon.type === "percentage") return `${coupon.value}%`;
    if (coupon.type === "credits") return `${coupon.value} credits`;
    return `$${coupon.value}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6" />
            {t.title || "Discount Coupons"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {coupons.length} coupons
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCoupons} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showForm ? "Cancel" : "Create Coupon"}
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Coupon</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SAVE20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="credits">Credits</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "20" : "10"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses</label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Valid Days
              </label>
              <Input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                placeholder="Forever"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={createCoupon} disabled={creating}>
              {creating ? "Creating..." : "Create Coupon"}
            </Button>
          </div>
        </Card>
      )}

      {/* Coupons Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      {getTypeIcon(coupon.type)}
                      {coupon.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                    {formatValue(coupon)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {coupon.current_uses} / {coupon.max_uses || "∞"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={coupon.is_active ? "success" : "default"}>
                      {coupon.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No coupons created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
