"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useContent } from "@/hooks/use-content";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Play,
  MoreVertical,
  Edit,
  Trash2,
  GitBranch,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Workflow, WorkflowStatus } from "@/lib/agents/workflow/types";

export function WorkflowList() {
  const { content } = useContent();
  const t = content.agentPlatform.workflows as any;
  const common = content.agentPlatform.common as any;
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to load workflows");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreate = () => {
    router.push("/agents/workflows/new");
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm || "Are you sure?")) return;

    try {
      setIsProcessing(id);
      const res = await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete workflow");

      toast.success(t.toasts.deleted);
      setWorkflows(workflows.filter((w) => w.id !== id));
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRun = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsProcessing(id);
      const res = await fetch(`/api/workflows/${id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "manual" }),
      });

      if (!res.ok) throw new Error("Failed to run workflow");

      toast.success(t.toasts.runStarted);
      router.push("/agents/traces"); // Or to a specific run view if available
    } catch (error) {
      console.error("Error running workflow:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
            {t.status.active}
          </Badge>
        );
      case "paused":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
          >
            {t.status.paused}
          </Badge>
        );
      case "draft":
        return <Badge variant="outline">{t.status.draft}</Badge>;
      case "archived":
        return <Badge variant="secondary">{t.status.archived}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t.create}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.triggerType}</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>{t.statusTitle || "Status"}</TableHead>
                <TableHead className="text-right">{common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : workflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <GitBranch className="w-12 h-12 mb-4 opacity-20" />
                      <h3 className="text-lg font-medium">{t.empty}</h3>
                      <p className="text-sm mt-1 mb-4">{t.emptyDesc}</p>
                      <Button variant="outline" onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t.create}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((workflow) => (
                  <TableRow
                    key={workflow.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/agents/workflows/${workflow.id}`)
                    }
                  >
                    <TableCell>
                      <div className="font-medium">{workflow.name}</div>
                      {workflow.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {workflow.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {workflow.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary/50" />
                        {workflow.nodes?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleRun(workflow.id, e)}
                          title="Run workflow"
                        >
                          {isProcessing === workflow.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/agents/workflows/${workflow.id}`)
                              }
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(workflow.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {common.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
