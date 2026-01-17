"use client";

/**
 * Security Settings Page
 *
 * MFA enrollment and management for premium users.
 */

import { useState, useEffect, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Smartphone,
  Trash2,
  RefreshCw,
  CheckCircle,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { LanguageContext } from "@/context/language-context";
import { toast } from "sonner";

interface MfaFactor {
  id: string;
  friendly_name: string;
  factor_type: string;
  status: string;
}

export default function SecuritySettingsPage() {
  const ctx = useContext(LanguageContext);
  const t = ((ctx?.content as any)?.security || {}) as Record<string, string>;

  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [hasMfa, setHasMfa] = useState(false);

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Tier restriction
  const [tierError, setTierError] = useState<string | null>(null);

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const fetchMfaStatus = async () => {
    try {
      const res = await fetch("/api/auth/mfa/unenroll");
      if (res.ok) {
        const data = await res.json();
        setFactors(data.factors || []);
        setHasMfa(data.hasMfa);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    setEnrolling(true);
    setTierError(null);

    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "mfa/tier_required") {
          setTierError(data.message);
        } else {
          toast.error(data.message || "Failed to start enrollment");
        }
        setEnrolling(false);
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setFactorId(data.factorId);
    } catch {
      toast.error("Failed to start MFA enrollment");
      setEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!factorId || verifyCode.length !== 6) return;

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: verifyCode }),
      });

      if (res.ok) {
        toast.success("MFA successfully enabled!");
        resetEnrollment();
        fetchMfaStatus();
      } else {
        const data = await res.json();
        toast.error(data.message || "Invalid code");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const removeFactor = async (id: string) => {
    if (!confirm("Remove this authentication method?")) return;

    try {
      const res = await fetch(`/api/auth/mfa/unenroll?factorId=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("MFA disabled");
        fetchMfaStatus();
      } else {
        toast.error("Failed to remove MFA");
      }
    } catch {
      toast.error("Failed to remove MFA");
    }
  };

  const resetEnrollment = () => {
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6" />
          {t.title || "Security Settings"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t.description || "Manage your account security and authentication"}
        </p>
      </div>

      {/* MFA Section */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-gray-500">
                Add an extra layer of security using an authenticator app
              </p>
            </div>
          </div>
          {hasMfa && (
            <Badge variant="success" size="sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          )}
        </div>

        {/* Tier error */}
        {tierError && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Lock className="w-4 h-4" />
              <span className="font-medium">{tierError}</span>
            </div>
            <Button size="sm" className="mt-2" asChild>
              <a href="/billing">Upgrade Plan</a>
            </Button>
          </div>
        )}

        {/* Existing factors */}
        {factors.length > 0 && (
          <div className="space-y-2 mb-4">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {factor.friendly_name || "Authenticator App"}
                  </span>
                  <Badge variant="success" size="sm">
                    {factor.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFactor(factor.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Enrollment form */}
        {qrCode && !hasMfa ? (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                Can&apos;t scan? Enter this code manually:
              </p>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                {secret}
              </code>
            </div>
            <div className="flex gap-2">
              <Input
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <Button
                onClick={verifyEnrollment}
                disabled={verifyCode.length !== 6 || verifying}
              >
                {verifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={resetEnrollment}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        ) : !hasMfa ? (
          <Button
            onClick={startEnrollment}
            disabled={enrolling}
            className="gap-2"
          >
            {enrolling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Enable Two-Factor Authentication
          </Button>
        ) : null}
      </Card>

      {/* Security tips */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Security Recommendations
            </h3>
            <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Use a strong, unique password</li>
              <li>• Enable two-factor authentication</li>
              <li>• Keep your recovery codes in a safe place</li>
              <li>• Review your active sessions regularly</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
