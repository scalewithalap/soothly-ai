"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { useContent } from "@/hooks/use-content";

export default function ForgotPasswordPage() {
  const { content } = useContent();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {content.auth.forgotPassword.successHeadline}
          </h1>
          <p
            className="text-gray-600 dark:text-gray-400 mb-6"
            dangerouslySetInnerHTML={{
              __html: content.auth.forgotPassword.successMessage.replace(
                "{email}",
                `<strong>${email}</strong>`
              ),
            }}
          />
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {content.auth.forgotPassword.backToLogin}
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
            {content.auth.forgotPassword.headline}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {content.auth.forgotPassword.subheadline}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">
              {content.auth.forgotPassword.emailLabel}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={content.auth.forgotPassword.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? content.auth.forgotPassword.submittingButton
              : content.auth.forgotPassword.submitButton}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            {content.auth.forgotPassword.backToLogin}
          </Link>
        </div>
      </Card>
    </div>
  );
}
