/**
 * Workflow Builder Page
 * Visual DAG editor for creating agent workflows
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Node, Edge } from "reactflow";
import WorkflowBuilder, {
  WorkflowNodeData,
} from "@/components/agents/WorkflowBuilder";
import { Loader2 } from "lucide-react";

export default function WorkflowBuilderPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [initialNodes, setInitialNodes] = useState<Node<WorkflowNodeData>[]>(
    [],
  );
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);

  // Load existing workflow if editing
  useEffect(() => {
    // Check URL params for workflow ID
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      setWorkflowId(id);
      // Fetch workflow data
      fetch(`/api/workflows/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.nodes) setInitialNodes(data.nodes);
          if (data.edges) setInitialEdges(data.edges);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Save workflow
  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      const endpoint = workflowId
        ? `/api/workflows/${workflowId}`
        : "/api/workflows";
      const method = workflowId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Workflow",
          nodes,
          edges,
          trigger_type: "manual",
          status: "draft",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }

      const data = await response.json();
      if (!workflowId && data.id) {
        setWorkflowId(data.id);
        window.history.replaceState(null, "", `?id=${data.id}`);
      }
    },
    [workflowId],
  );

  // Run workflow
  const handleRun = useCallback(async (id: string) => {
    const response = await fetch(`/api/workflows/${id}/runs`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to start workflow");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {workflowId ? "Edit Workflow" : "New Workflow"}
        </h1>
        <p className="text-muted-foreground">
          Drag and drop nodes to build your agent workflow
        </p>
      </div>

      <WorkflowBuilder
        workflowId={workflowId || undefined}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onSave={handleSave}
        onRun={handleRun}
      />
    </div>
  );
}

