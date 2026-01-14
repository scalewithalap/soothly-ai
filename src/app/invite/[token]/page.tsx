"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Users, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface InvitationDetails {
  email: string;
  role: "admin" | "member";
  status: string;
  organization_name: string;
  is_valid: boolean;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { content } = useContent();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthAndFetchInvitation();
  }, [token]);

  const checkAuthAndFetchInvitation = async () => {
    try {
      // Check if logged in
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      // Fetch invitation details
      const res = await fetch(`/api/team/invitations/accept?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvitation(data.invitation);
      } else {
        setError("Invitation not found or has expired");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const res = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      console.error("Accept error:", err);
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {content.invite.welcome}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {content.invite.redirecting}
            </p>
          </div>
        ) : error && !invitation ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {content.invite.invalid.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Link href="/">
              <Button variant="ghost">
                {content.invite.invalid.homeButton}
              </Button>
            </Link>
          </div>
        ) : invitation && !invitation.is_valid ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {invitation.status === "expired"
                ? content.invite.expired.titleExpired
                : content.invite.expired.titleUsed}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {content.invite.expired.message}
            </p>
            <Link href="/">
              <Button variant="ghost">
                {content.invite.invalid.homeButton}
              </Button>
            </Link>
          </div>
        ) : invitation ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {content.invite.valid.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              <span className="font-medium text-gray-900 dark:text-white">
                {invitation.organization_name}
              </span>{" "}
              {content.invite.valid.messagePart1}{" "}
              <span className="font-medium capitalize">{invitation.role}</span>
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleAccept}
                loading={accepting}
              >
                {isLoggedIn
                  ? content.invite.valid.acceptButton
                  : content.invite.valid.loginButton}
              </Button>
              {!isLoggedIn && (
                <p className="text-sm text-gray-500">
                  {content.invite.valid.signupPrompt}{" "}
                  <Link
                    href={`/signup?redirect=/invite/${token}`}
                    className="text-violet-600 hover:underline"
                  >
                    {content.invite.valid.signupLink}
                  </Link>
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
