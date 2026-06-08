/**
 * Workflow Builder Component
 * Visual DAG editor using @xyflow/react (reactflow)
 */

"use client";

import { useCallback, useState, useRef, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Panel,
  BackgroundVariant,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Play,
  Trash2,
  Plus,
  Settings,
  Bot,
  GitBranch,
  Timer,
  UserCheck,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";

// Node type definitions
export type WorkflowNodeType =
  | "agent"
  | "condition"
  | "delay"
  | "humanReview"
  | "loop"
  | "start"
  | "end";

export interface WorkflowNodeData {
  label: string;
  description?: string;
  nodeType: WorkflowNodeType;
  config?: Record<string, unknown>;
}

// Node icons
const nodeIcons: Record<WorkflowNodeType, React.ReactNode> = {
  agent: <Bot className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  delay: <Timer className="h-4 w-4" />,
  humanReview: <UserCheck className="h-4 w-4" />,
  loop: <Repeat className="h-4 w-4" />,
  start: <Play className="h-4 w-4" />,
  end: <div className="h-3 w-3 rounded-full bg-red-500" />,
};

// Node colors
const nodeColors: Record<WorkflowNodeType, string> = {
  agent: "border-indigo-500 bg-indigo-500/10",
  condition: "border-amber-500 bg-amber-500/10",
  delay: "border-blue-500 bg-blue-500/10",
  humanReview: "border-green-500 bg-green-500/10",
  loop: "border-purple-500 bg-purple-500/10",
  start: "border-emerald-500 bg-emerald-500/10",
  end: "border-red-500 bg-red-500/10",
};

// Custom node component
function WorkflowNode({
  data,
  selected,
}: {
  data: WorkflowNodeData;
  selected: boolean;
}) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[150px]
        ${nodeColors[data.nodeType]}
        ${selected ? "ring-2 ring-primary ring-offset-2" : ""}
        transition-all duration-200
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        {nodeIcons[data.nodeType]}
        <span className="font-medium text-sm">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
          {data.description}
        </p>
      )}
    </div>
  );
}

// Node types for ReactFlow
const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

// Node palette items
const paletteItems: { type: WorkflowNodeType; label: string }[] = [
  { type: "agent", label: "Agent" },
  { type: "condition", label: "Condition" },
  { type: "delay", label: "Delay" },
  { type: "humanReview", label: "Human Review" },
  { type: "loop", label: "Loop" },
];

interface WorkflowBuilderProps {
  workflowId?: string;
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => Promise<void>;
  onRun?: (workflowId: string) => Promise<void>;
}

export function WorkflowBuilder({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onRun,
}: WorkflowBuilderProps) {
  // Default nodes if none provided
  const defaultNodes: Node<WorkflowNodeData>[] = useMemo(
    () =>
      initialNodes.length > 0
        ? initialNodes
        : [
            {
              id: "start",
              type: "workflowNode",
              position: { x: 250, y: 25 },
              data: { label: "Start", nodeType: "start" },
            },
            {
              id: "end",
              type: "workflowNode",
              position: { x: 250, y: 400 },
              data: { label: "End", nodeType: "end" },
            },
          ],
    [initialNodes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Add new node from palette
  const onAddNode = useCallback(
    (type: WorkflowNodeType) => {
      const newNode: Node<WorkflowNodeData> = {
        id: `${type}-${Date.now()}`,
        type: "workflowNode",
        position: {
          x: Math.random() * 300 + 100,
          y: Math.random() * 200 + 100,
        },
        data: {
          label: paletteItems.find((p) => p.type === type)?.label || type,
          nodeType: type,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  // Delete selected node
  const onDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    if (
      selectedNode.data.nodeType === "start" ||
      selectedNode.data.nodeType === "end"
    ) {
      toast.error("Cannot delete start or end nodes");
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id,
      ),
    );
    setSelectedNode(null);
    toast.success("Node deleted");
  }, [selectedNode, setNodes, setEdges]);

  // Save workflow
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(nodes, edges);
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, onSave]);

  // Run workflow
  const handleRun = useCallback(async () => {
    if (!onRun || !workflowId) return;
    try {
      await onRun(workflowId);
      toast.success("Workflow started");
    } catch {
      toast.error("Failed to start workflow");
    }
  }, [onRun, workflowId]);

  // Drop handler for drag-and-drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/reactflow",
      ) as WorkflowNodeType;

      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node<WorkflowNodeData> = {
        id: `${type}-${Date.now()}`,
        type: "workflowNode",
        position,
        data: {
          label: paletteItems.find((p) => p.type === type)?.label || type,
          nodeType: type,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="flex h-[600px] gap-4">
      {/* Node Palette */}
      <Card className="w-48 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nodes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {paletteItems.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onAddNode(item.type)}
              className={`
                flex items-center gap-2 p-2 rounded-md cursor-pointer
                border transition-colors hover:bg-muted
                ${nodeColors[item.type]}
              `}
            >
              {nodeIcons[item.type]}
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Flow Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

          {/* Toolbar */}
          <Panel position="top-right" className="flex gap-2">
            {selectedNode &&
              selectedNode.data.nodeType !== "start" &&
              selectedNode.data.nodeType !== "end" && (
                <Button variant="destructive" size="sm" onClick={onDeleteNode}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {workflowId && (
              <Button size="sm" onClick={handleRun}>
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {/* Node Config Panel */}
      {selectedNode && (
        <Card className="w-64 shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Node Config</CardTitle>
              <Badge variant="outline">{selectedNode.data.nodeType}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Label</label>
              <p className="font-medium">{selectedNode.data.label}</p>
            </div>
            {selectedNode.data.description && (
              <div>
                <label className="text-xs text-muted-foreground">
                  Description
                </label>
                <p className="text-sm">{selectedNode.data.description}</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full">
              <Settings className="h-4 w-4 mr-1" />
              Configure
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WorkflowBuilder;

