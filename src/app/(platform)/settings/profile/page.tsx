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

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z
  .object({
    current_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfileSettingsPage() {
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

  const fetchProfile = async () => {
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
        throw new Error(errorData.error || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
      fetchProfile();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
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
        throw new Error(errorData.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
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
              Profile Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your personal details
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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John Doe" />
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
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" disabled />
                  </FormControl>
                  <FormDescription>
                    Email cannot be changed. Contact support if needed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </form>
        </Form>
      </Card>

      {/* Password Change */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Key className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Change Password
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your account password
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
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" />
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
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" />
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
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" />
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
                ? "Updating..."
                : "Update Password"}
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
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Two-factor authentication is not yet enabled for your account.
          </p>
          <Button variant="outline" className="mt-3" disabled>
            Enable 2FA (Coming Soon)
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
              Danger Zone
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Irreversible and destructive actions
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <Button variant="destructive" disabled>
            Delete Account (Contact Support)
          </Button>
        </div>
      </Card>
    </div>
  );
}
