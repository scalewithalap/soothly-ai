"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useContent } from "@/hooks/use-content";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  X,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { content } = useContent();
  const supabase = createClient();

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navigation = [
    {
      name: content.sidebar.dashboard,
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    { name: content.sidebar.agents, href: "/agents", icon: Users },
    { name: content.sidebar.billing, href: "/billing", icon: CreditCard },
    { name: content.sidebar.settings, href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 lg:hidden"
      >
        <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 lg:static",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 overflow-hidden transition-all",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-[#9382FF] flex items-center justify-center shrink-0">
              <span className="text-white font-bold">Z</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
              Zero Headache
            </span>
          </Link>

          <div className={cn("hidden lg:flex", collapsed && "mx-auto")}>
            {collapsed && (
              <Link
                href="/dashboard"
                className="w-8 h-8 rounded-lg bg-[#9382FF] flex items-center justify-center shrink-0"
              >
                <span className="text-white font-bold">Z</span>
              </Link>
            )}
          </div>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toggle button (Desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group",
                  isActive
                    ? "bg-[#9382FF]/10 text-[#9382FF] dark:bg-[#9382FF]/20 dark:text-[#9382FF]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn("w-5 h-5 shrink-0", isActive && "text-current")}
                />
                {!collapsed && (
                  <span className="font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
          {!collapsed && (
            <div className="flex justify-center">
              <LanguageSwitcher />
            </div>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? content.sidebar.signOut : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="font-medium">{content.sidebar.signOut}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
