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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe, Clock, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const organizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  default_language: z.string(),
  timezone: z.string(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export default function OrganizationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<{
    id: string;
    name: string;
    subscription_tier: string | null;
  } | null>(null);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      default_language: "en",
      timezone: "America/New_York",
    },
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (userData?.org_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("id, name, subscription_tier")
            .eq("id", userData.org_id)
            .single();

          if (orgData) {
            setOrg(orgData);
            form.reset({
              name: orgData.name || "",
              default_language: "en",
              timezone: "America/New_York",
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update organization");
      }

      toast.success("Organization settings updated");
      fetchOrganization();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Organization Info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organization Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your organization&apos;s information
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Inc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Current Plan
              </p>
              <p className="text-lg font-semibold text-violet-600 dark:text-violet-400 capitalize">
                {org?.subscription_tier || "Starter"}
              </p>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </Card>

      {/* Localization */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Localization
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set your default language and timezone
            </p>
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="default_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Default language for your organization
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timezone
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Used for scheduling and activity timestamps
                  </FormDescription>
                </FormItem>
              )}
            />
          </form>
        </Form>
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
              Destructive actions for your organization
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Deleting your organization will remove all data including team
            members, agents, and generated content. This action cannot be
            undone.
          </p>
          <Button variant="destructive" disabled>
            Delete Organization (Contact Support)
          </Button>
        </div>
      </Card>
    </div>
  );
}
