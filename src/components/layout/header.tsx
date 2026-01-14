"use client";

import { Bell, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useContent } from "@/hooks/use-content";

export function Header() {
  const { content } = useContent();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-4 flex-1">
        {/* Search - Hidden on mobile, visible on desktop */}
        <div className="w-full max-w-sm hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={content.header.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Credits */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-full border border-violet-100 dark:border-violet-800">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            2,450 {content.dashboard.stats.totalCredits}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
        </button>

        {/* Avatar */}
        <div className="pl-2 border-l border-gray-200 dark:border-gray-800">
          <Avatar
            src="https://avatars.githubusercontent.com/u/124599"
            fallback="JD"
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}
