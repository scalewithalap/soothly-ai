"use client";

import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  Connection,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { useContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Play, ArrowLeft, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
} from "@/agents/workflow/types";

// Custom Node Types (placeholder for now, using default)
const nodeTypes = {};

export function WorkflowBuilder({ workflowId }: { workflowId: string }) {
  const { content } = useContent();
  const t = content.agentPlatform.workflows as any;
  const router = useRouter();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isNew = workflowId === "new";

  useEffect(() => {
    if (!isNew) {
      fetchWorkflow();
    } else {
      setIsLoading(false);
    }
  }, [workflowId]);

  const fetchWorkflow = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      const data: Workflow = await res.json();

      setWorkflowName(data.name);

      // Map API nodes to ReactFlow nodes
      const flowNodes: Node[] = data.nodes.map((n) => ({
        id: n.id,
        type: "default", // or specific type mapping
        position: n.position || { x: 0, y: 0 },
        data: { label: n.name, ...n },
      }));

      // Map API edges to ReactFlow edges
      const flowEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      toast.error("Failed to load workflow");
    } finally {
      setIsLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "default",
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const handleSave = async () => {
    if (!workflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }

    try {
      setIsSaving(true);

      const apiNodes: WorkflowNode[] = nodes.map((n) => ({
        id: n.id,
        type: "agent", // Simplified for now
        name: n.data.label || "Unnamed Node",
        position: n.position,
        ...n.data,
      }));

      const apiEdges: WorkflowEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label as string,
      }));

      const payload = {
        name: workflowName,
        nodes: apiNodes,
        edges: apiEdges,
        trigger_type: "manual",
        status: "draft",
      };

      const url = isNew ? "/api/workflows" : `/api/workflows/${workflowId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save workflow");

      const savedData = await res.json();
      toast.success(t.toasts.saved);

      if (isNew && savedData.id) {
        router.replace(`/agents/workflows/${savedData.id}`);
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/agents/workflows")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-64 font-semibold text-lg border-transparent hover:border-input focus:border-input transition-colors"
            placeholder="Workflow Name"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : t.builder.save}
          </Button>
          {!isNew && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              {t.run}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/10 p-4 flex flex-col gap-4">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
            Components
          </div>

          <div
            className="p-3 bg-card border rounded cursor-grab shadow-sm hover:shadow-md transition-shadow"
            onDragStart={(event) =>
              event.dataTransfer.setData("application/reactflow", "Agent")
            }
            draggable
          >
            <div className="font-medium">Agent Node</div>
            <div className="text-xs text-muted-foreground">
              Executes an AI agent
            </div>
          </div>

          <div
            className="p-3 bg-card border rounded cursor-grab shadow-sm hover:shadow-md transition-shadow"
            onDragStart={(event) =>
              event.dataTransfer.setData("application/reactflow", "Condition")
            }
            draggable
          >
            <div className="font-medium">Condition</div>
            <div className="text-xs text-muted-foreground">Branching logic</div>
          </div>

          <div
            className="p-3 bg-card border rounded cursor-grab shadow-sm hover:shadow-md transition-shadow"
            onDragStart={(event) =>
              event.dataTransfer.setData("application/reactflow", "Human")
            }
            draggable
          >
            <div className="font-medium">Human Approval</div>
            <div className="text-xs text-muted-foreground">
              Pause for review
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full bg-slate-50 dark:bg-slate-950/50">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
              attributionPosition="bottom-right"
              nodeTypes={nodeTypes}
            >
              <Controls />
              <MiniMap />
              <Background gap={12} size={1} />
              <Panel position="top-right">
                <Card className="p-2 flex gap-2">
                  <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Card>
              </Panel>
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}
