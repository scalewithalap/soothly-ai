"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Gift, Users, DollarSign, Zap } from "lucide-react";
import { useContent } from "@/hooks/use-content";

const applySchema = z.object({
  payment_method: z.enum(["paypal", "bank_transfer", "stripe"]),
  payment_email: z.string().email("Valid email required").optional(),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
});

type ApplyFormData = z.infer<typeof applySchema>;

export default function AffiliateApplyPage() {
  const router = useRouter();
  const { content } = useContent();
  const t = content.affiliate?.apply as any;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApplyFormData>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      payment_method: "paypal",
    },
  });

  const paymentMethod = watch("payment_method");

  const onSubmit = async (data: ApplyFormData) => {
    try {
      setIsSubmitting(true);

      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: data.payment_method,
          payment_details: {
            email: data.payment_email,
          },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error?.code === "affiliate/already_exists") {
          toast.info(t?.alreadyApplied || "You have already applied");
          router.push("/affiliate");
          return;
        }
        throw new Error(result.error?.message || "Application failed");
      }

      toast.success(t?.success || "Application submitted successfully!");
      router.push("/affiliate");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error(t?.error || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {t?.title || "Join Our Affiliate Program"}
        </h1>
        <p className="text-muted-foreground">
          {t?.subtitle ||
            "Partner with us and earn commissions on every referral"}
        </p>
      </div>

      {/* Benefits */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">
              {t?.benefits?.commission?.title || "20% Commission"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t?.benefits?.commission?.description ||
                "On every successful referral"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">
              {t?.benefits?.tracking?.title || "Real-time Tracking"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t?.benefits?.tracking?.description ||
                "Monitor your referrals live"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">
              {t?.benefits?.payouts?.title || "Fast Payouts"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t?.benefits?.payouts?.description || "Weekly payouts via PayPal"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t?.form?.title || "Application Form"}</CardTitle>
          <CardDescription>
            {t?.form?.description ||
              "Fill out the form below to apply for our affiliate program"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="payment_method">
                {t?.form?.paymentMethod || "Preferred Payment Method"}
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setValue(
                    "payment_method",
                    value as "paypal" | "bank_transfer" | "stripe",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "paypal" && (
              <div className="space-y-2">
                <Label htmlFor="payment_email">
                  {t?.form?.paypalEmail || "PayPal Email"}
                </Label>
                <Input
                  id="payment_email"
                  type="email"
                  placeholder="your@email.com"
                  {...register("payment_email")}
                />
                {errors.payment_email && (
                  <p className="text-sm text-destructive">
                    {errors.payment_email.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                onCheckedChange={(checked) =>
                  setValue(
                    "terms_accepted",
                    checked === true ? true : (false as any),
                  )
                }
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t?.form?.termsLabel ||
                    "I agree to the affiliate program terms and conditions"}
                </label>
                {errors.terms_accepted && (
                  <p className="text-sm text-destructive">
                    {errors.terms_accepted.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t?.form?.submit || "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

