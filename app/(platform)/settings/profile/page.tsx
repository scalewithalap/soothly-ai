"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { Shield, Trash2, Key } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContent } from "@/lib/content";

export default function ProfileSettingsPage() {
  const { dict } = useContent();
  const t = dict.settings.profile;

  const profileSchema = z.object({
    full_name: z.string().min(2, t.validation.nameTooShort),
    email: z.string().email(t.validation.invalidEmail),
  });

  const passwordSchema = z
    .object({
      current_password: z.string().min(8, t.validation.passwordTooShort),
      new_password: z.string().min(8, t.validation.passwordTooShort),
      confirm_password: z.string(),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: t.validation.passwordMismatch,
      path: ["confirm_password"],
    });

  type ProfileFormData = z.infer<typeof profileSchema>;
  type PasswordFormData = z.infer<typeof passwordSchema>;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, email, full_name, avatar_url")
          .eq("id", authUser.id)
          .single();

        if (userData) {
          setUser(userData);
          profileForm.reset({
            full_name: userData.full_name || "",
            email: userData.email || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t.toasts.updateError);
      }

      toast.success(t.toasts.updateSuccess);
      fetchProfile();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.toasts.updateError,
      );
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const res = await fetch("/api/settings/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.current_password,
          newPassword: data.new_password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t.password.toasts.error);
      }

      toast.success(t.password.toasts.success);
      passwordForm.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.password.toasts.error,
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Profile Info */}
      <Card className="p-6">
        <div className="flex items-start gap-6 mb-6">
          <Avatar
            src={user?.avatar_url || undefined}
            fallback={initials}
            size="xl"
            className="w-20 h-20"
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.description}
            </p>
          </div>
        </div>

        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <FormField
              control={profileForm.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.fullNameLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t.fullNamePlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.emailLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" disabled />
                  </FormControl>
                  <FormDescription>{t.emailDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting
                ? t.savingButton
                : t.saveButton}
            </Button>
          </form>
        </Form>
      </Card>

      {/* Password Change */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[#9382FF]/20 dark:bg-[#9382FF]/30">
            <Key className="w-5 h-5 text-[#9382FF] dark:text-[#9382FF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.password.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.password.description}
            </p>
          </div>
        </div>

        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <FormField
              control={passwordForm.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.password.currentLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={t.password.placeholder}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.password.newLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={t.password.placeholder}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.password.confirmLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={t.password.placeholder}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting
                ? t.password.updatingButton
                : t.password.updateButton}
            </Button>
          </form>
        </Form>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.twoFactor.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.twoFactor.description}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.twoFactor.notEnabled}
          </p>
          <Button variant="outline" className="mt-3" disabled>
            {t.twoFactor.enableButton}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
              {t.dangerZone.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.dangerZone.description}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {t.dangerZone.deleteWarning}
          </p>
          <Button variant="destructive" disabled>
            {t.dangerZone.deleteButton}
          </Button>
        </div>
      </Card>
    </div>
  );
}

