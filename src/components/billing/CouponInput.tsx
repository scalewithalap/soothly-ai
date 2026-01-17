"use client";

/**
 * CouponInput Component
 *
 * Reusable coupon input with validation and discount preview.
 * For use in billing/checkout flows.
 */

import { useState, useContext } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { LanguageContext } from "@/context/language-context";
import { toast } from "sonner";

interface CouponInputProps {
  applyTo: "subscription" | "credits";
  amount: number;
  onApply: (coupon: CouponResult) => void;
  onClear: () => void;
}

interface CouponResult {
  valid: boolean;
  coupon_id?: string;
  code?: string;
  type?: string;
  discount_amount?: number;
  final_amount?: number;
  error?: string;
}

export function CouponInput({
  applyTo,
  amount,
  onApply,
  onClear,
}: CouponInputProps) {
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.coupons || {}) as Record<string, string>;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  const validateCoupon = async () => {
    if (!code.trim()) {
      toast.error(t.enterCode || "Please enter a coupon code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          applyTo,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        toast.error(
          data.error_message || t.invalidCode || "Invalid coupon code",
        );
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(data);
      onApply(data);
      toast.success(t.applied || "Coupon applied successfully!");
    } catch {
      toast.error(t.validationFailed || "Failed to validate coupon");
    } finally {
      setLoading(false);
    }
  };

  const clearCoupon = () => {
    setCode("");
    setAppliedCoupon(null);
    onClear();
  };

  const formatDiscount = (coupon: CouponResult) => {
    if (coupon.type === "percentage") {
      return `${coupon.discount_amount}% off`;
    }
    if (coupon.type === "credits") {
      return `+${coupon.discount_amount} credits`;
    }
    return `$${coupon.discount_amount?.toFixed(2)} off`;
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-green-800 dark:text-green-200">
              {appliedCoupon.code}
            </span>
            <span className="text-sm text-green-600 dark:text-green-400">
              {formatDiscount(appliedCoupon)}
            </span>
          </div>
          {appliedCoupon.final_amount !== undefined && (
            <p className="text-xs text-green-600 dark:text-green-400">
              {t.newTotal || "New total"}: $
              {appliedCoupon.final_amount.toFixed(2)}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={clearCoupon}
          className="text-green-600 hover:text-green-800"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Tag className="w-4 h-4" />
        {t.haveCode || "Have a coupon code?"}
      </label>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t.codePlaceholder || "SAVE20"}
          className="flex-1 font-mono uppercase"
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && validateCoupon()}
        />
        <Button
          onClick={validateCoupon}
          disabled={loading || !code.trim()}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t.apply || "Apply"
          )}
        </Button>
      </div>
    </div>
  );
}
