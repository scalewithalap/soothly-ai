"use client";

/**
 * Email Verification Pending Page
 *
 * Shown after signup when email verification is required.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      // Get email from session storage or URL params
      const email = sessionStorage.getItem("pending_verification_email");

      if (!email) {
        toast.error("Please sign up again to receive a verification email");
        return;
      }

      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResent(true);
        toast.success("Verification email sent!");
      } else {
        toast.error("Failed to resend verification email");
      }
    } catch {
      toast.error("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#9382FF]/10 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-[#9382FF]/20 dark:bg-[#9382FF]/30 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-[#9382FF]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Check your email
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We&apos;ve sent you a verification link. Click the link in your email
          to verify your account and get started.
        </p>

        <div className="space-y-4">
          {resent ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Email sent!</span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resending}
              className="w-full"
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Resend verification email
            </Button>
          )}

          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              onClick={handleResend}
              className="text-[#9382FF] hover:underline"
              disabled={resending}
            >
              click here to resend
            </button>
            .
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a href="/login" className="text-sm text-[#9382FF] hover:underline">
            Back to login
          </a>
        </div>
      </Card>
    </div>
  );
}
