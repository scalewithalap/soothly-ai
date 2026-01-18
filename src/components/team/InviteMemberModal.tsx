"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Mail, UserPlus } from "lucide-react";
import { useContent } from "@/hooks/use-content";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: "admin" | "member") => Promise<void>;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
}: InviteMemberModalProps) {
  const { content } = useContent();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError(content.errors.validation.invalidEmail);
      return;
    }

    setLoading(true);
    try {
      await onInvite(email, role);
      setEmail("");
      setRole("member");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : content.errors.generic.server
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9382FF]/20 dark:bg-[#9382FF]/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#9382FF] dark:text-[#9382FF]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {content.settings.team.inviteModal.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {content.settings.team.inviteModal.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label={content.settings.team.inviteModal.emailLabel}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {content.settings.team.inviteModal.roleLabel}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("member")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    role === "member"
                      ? "border-[#9382FF] bg-[#9382FF]/10 dark:bg-[#9382FF]/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    {content.settings.team.inviteModal.member}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {content.settings.team.inviteModal.memberDesc}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    role === "admin"
                      ? "border-[#9382FF] bg-[#9382FF]/10 dark:bg-[#9382FF]/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    {content.settings.team.inviteModal.admin}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {content.settings.team.inviteModal.adminDesc}
                  </p>
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
              >
                {content.settings.team.inviteModal.cancel}
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                {content.settings.team.inviteModal.sendButton}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

