"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Tag,
  Settings,
  ChevronRight,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/audit-log", icon: ScrollText, label: "Audit Log" },
  { href: "/admin/coupons", icon: Tag, label: "Coupons" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pathname, setPathname] = useState("");

  const checkAdminAccess = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      setIsAdmin(true);
    } catch {
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    setPathname(window.location.pathname);
    checkAdminAccess();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <h2 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Admin Panel
          </h2>
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#9382FF]/20 dark:bg-[#9382FF]/30 text-[#9382FF] dark:text-[#B8AEFF]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
