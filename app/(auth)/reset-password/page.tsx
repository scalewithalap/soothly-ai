"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useContent } from "@/hooks/use-content";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { content } = useContent();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(content.auth.resetPassword.errors.invalidToken);
    }
  }, [token, content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(content.auth.resetPassword.errors.passwordLength);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(content.auth.resetPassword.errors.mismatch);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        toast.success(content.auth.resetPassword.successHeadline);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        if (data.error === "auth/token_expired") {
          setError(content.auth.resetPassword.errors.expired);
        } else if (data.error === "auth/token_already_used") {
          setError(content.auth.resetPassword.errors.alreadyUsed);
        } else {
          toast.error(
            data.message || content.auth.resetPassword.errors.generic,
          );
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {content.auth.resetPassword.invalidLinkHeadline}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/forgot-password">
            <Button>{content.auth.resetPassword.invalidLinkButton}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {content.auth.resetPassword.successHeadline}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {content.auth.resetPassword.successMessage}
          </p>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {content.auth.resetPassword.successButton}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {content.auth.resetPassword.headline}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {content.auth.resetPassword.subheadline}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">
              {content.auth.resetPassword.passwordLabel}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={content.auth.resetPassword.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {content.auth.resetPassword.confirmPasswordLabel}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={
                content.auth.resetPassword.confirmPasswordPlaceholder
              }
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? content.auth.resetPassword.submittingButton
              : content.auth.resetPassword.submitButton}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-[#9382FF] hover:text-[#7B6AF0] dark:text-[#9382FF] inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            {content.auth.resetPassword.backToLogin}
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
