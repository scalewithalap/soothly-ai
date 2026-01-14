"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/use-content";

export default function ForgotPasswordPage() {
  const { content } = useContent();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        if (resetError.message.includes("not found")) {
          setError(content.auth.forgotPassword.errorEmailNotFound);
        } else {
          setError(resetError.message);
        }
        return;
      }

      setIsSuccess(true);
    } catch {
      setError(content.errors.generic.server);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {content.auth.forgotPassword.successHeadline}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {content.auth.forgotPassword.successMessage.replace(
              "{email}",
              email
            )}
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {content.auth.forgotPassword.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {content.auth.forgotPassword.headline}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {content.auth.forgotPassword.subheadline}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={content.auth.forgotPassword.emailLabel}
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={content.auth.forgotPassword.emailPlaceholder}
          required
        />

        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="w-full"
        >
          {content.auth.forgotPassword.submitButton}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {content.auth.forgotPassword.backToLogin}
        </Link>
      </div>
    </div>
  );
}
