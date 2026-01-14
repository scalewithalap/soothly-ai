"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  GripVertical,
  Plus,
} from "lucide-react";
import { useContext } from "react";
import { LanguageContext } from "@/context/language-context";
import { toast } from "sonner";

interface Brief {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  calendar_position?: number;
  created_at: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ContentCalendarPage() {
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.content?.calendar || {}) as Record<string, string>;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [unscheduled, setUnscheduled] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedBrief, setDraggedBrief] = useState<Brief | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    fetchBriefs();
  }, [monthStr]);

  const fetchBriefs = async () => {
    try {
      const res = await fetch(`/api/content/calendar?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs);
        setUnscheduled(data.unscheduled);
      }
    } catch (error) {
      console.error("Failed to fetch briefs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (briefId: string, date: string | null) => {
    try {
      const res = await fetch("/api/content/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId, scheduledDate: date }),
      });

      if (res.ok) {
        fetchBriefs();
        toast.success(
          date
            ? t.scheduled || "Content scheduled"
            : t.unscheduled || "Removed from calendar"
        );
      }
    } catch {
      toast.error(t.error || "Failed to update schedule");
    }
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getBriefsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return briefs.filter((b) => b.scheduled_date === dateStr);
  };

  const handleDragStart = (brief: Brief) => {
    setDraggedBrief(brief);
  };

  const handleDrop = (day: number) => {
    if (!draggedBrief) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    handleSchedule(draggedBrief.id, dateStr);
    setDraggedBrief(null);
  };

  const handleDropToUnscheduled = () => {
    if (!draggedBrief) return;
    handleSchedule(draggedBrief.id, null);
    setDraggedBrief(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "draft":
        return "bg-yellow-500";
      case "scheduled":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.title || "Content Calendar"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.subtitle || "Plan and schedule your content"}
            </p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t.newBrief || "New Brief"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3 p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`min-h-[100px] p-1 border rounded-lg transition-colors ${
                  day
                    ? "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    : "border-transparent"
                } ${
                  draggedBrief && day ? "ring-2 ring-violet-300 ring-inset" : ""
                }`}
                onDragOver={(e) => day && e.preventDefault()}
                onDrop={() => day && handleDrop(day)}
              >
                {day && (
                  <>
                    <div
                      className={`text-sm font-medium mb-1 ${
                        new Date().toDateString() ===
                        new Date(year, month, day).toDateString()
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {getBriefsForDay(day).map((brief) => (
                        <div
                          key={brief.id}
                          draggable
                          onDragStart={() => handleDragStart(brief)}
                          className="group flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-sm transition-shadow"
                        >
                          <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(
                              brief.status
                            )}`}
                          />
                          <span className="text-xs truncate flex-1">
                            {brief.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Unscheduled Queue */}
        <Card
          className="p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropToUnscheduled}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t.unscheduledTitle || "Unscheduled"}
            </h3>
            <Badge variant="default" className="ml-auto">
              {unscheduled.length}
            </Badge>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {unscheduled.length > 0 ? (
              unscheduled.map((brief) => (
                <div
                  key={brief.id}
                  draggable
                  onDragStart={() => handleDragStart(brief)}
                  className="group flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-sm transition-shadow"
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(
                      brief.status
                    )}`}
                  />
                  <span className="text-sm truncate flex-1">{brief.title}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                {t.noUnscheduled || "All content is scheduled"}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
