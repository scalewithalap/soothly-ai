"use client";

import { useState, useEffect, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Briefcase,
  Mail,
  Building2,
  RefreshCw,
} from "lucide-react";
import { LanguageContext } from "@/context/language-context";
import { toast } from "sonner";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  title?: string;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
}

const STAGES = [
  { id: "new", label: "New", color: "bg-gray-500", icon: Users },
  { id: "contacted", label: "Contacted", color: "bg-blue-500", icon: Phone },
  {
    id: "qualified",
    label: "Qualified",
    color: "bg-yellow-500",
    icon: CheckCircle,
  },
  {
    id: "proposal",
    label: "Proposal",
    color: "bg-indigo-500",
    icon: Briefcase,
  },
  {
    id: "negotiation",
    label: "Negotiation",
    color: "bg-purple-500",
    icon: Mail,
  },
  { id: "won", label: "Won", color: "bg-green-500", icon: CheckCircle },
  { id: "lost", label: "Lost", color: "bg-red-500", icon: XCircle },
];

export default function LeadPipelinePage() {
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.leads?.pipeline || {}) as Record<string, string>;

  const [pipeline, setPipeline] = useState<Record<string, Contact[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await fetch("/api/leads/pipeline");
      if (res.ok) {
        const data = await res.json();
        setPipeline(data.pipeline);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error("Failed to fetch pipeline:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMoveStage = async (contactId: string, newStage: string) => {
    try {
      const res = await fetch("/api/leads/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, stage: newStage }),
      });

      if (res.ok) {
        fetchPipeline();
        toast.success(t.moved || "Lead moved");
      }
    } catch {
      toast.error(t.error || "Failed to move lead");
    }
  };

  const handleDragStart = (contact: Contact) => {
    setDraggedContact(contact);
  };

  const handleDrop = (stageId: string) => {
    if (!draggedContact || draggedContact.pipeline_stage === stageId) {
      setDraggedContact(null);
      return;
    }
    handleMoveStage(draggedContact.id, stageId);
    setDraggedContact(null);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPipeline();
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
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.title || "Lead Pipeline"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.subtitle || "Manage your sales pipeline"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {t.refresh || "Refresh"}
          </Button>
          <Button className="gap-2">
            <Users className="w-4 h-4" />
            {t.addLead || "Add Lead"}
          </Button>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"
          >
            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {stage.label}
            </span>
            <Badge variant="default" className="text-xs">
              {counts[stage.id] || 0}
            </Badge>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const StageIcon = stage.icon;
          const stageContacts = pipeline[stage.id] || [];

          return (
            <div
              key={stage.id}
              className={`shrink-0 w-72 ${
                draggedContact && draggedContact.pipeline_stage !== stage.id
                  ? "ring-2 ring-violet-300 rounded-lg"
                  : ""
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div
                  className={`p-1.5 rounded ${stage.color} ${stage.color
                    .replace("bg-", "text-")
                    .replace("-500", "-100")}`}
                >
                  <StageIcon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {stage.label}
                </span>
                <Badge variant="default" className="ml-auto">
                  {stageContacts.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[200px]">
                {stageContacts.length > 0 ? (
                  stageContacts.map((contact) => (
                    <Card
                      key={contact.id}
                      draggable
                      onDragStart={() => handleDragStart(contact)}
                      className="p-3 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {contact.first_name?.[0]}
                          {contact.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.title && (
                            <p className="text-xs text-gray-500 truncate">
                              {contact.title}
                            </p>
                          )}
                          {contact.company && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">
                                {contact.company}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400">
                      {t.empty || "No leads"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
