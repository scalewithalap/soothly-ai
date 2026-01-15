"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Users, Plug, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const settingsTabs = [
  { id: "profile", href: "/settings/profile", icon: User, label: "Profile" },
  {
    id: "organization",
    href: "/settings/organization",
    icon: Building2,
    label: "Organization",
  },
  { id: "team", href: "/settings/team", icon: Users, label: "Team" },
  {
    id: "integrations",
    href: "/settings/integrations",
    icon: Plug,
    label: "Integrations",
  },
  {
    id: "notifications",
    href: "/settings/notifications",
    icon: Bell,
    label: "Notifications",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-3xl font-host font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage your account, organization, and preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-0">
        {settingsTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-violet-600 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div className="pt-2">{children}</div>
    </div>
  );
}
