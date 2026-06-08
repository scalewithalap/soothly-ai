"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2,
  Activity,
  Coins,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  TraceSummary,
  TraceStatus,
  AgentSpan,
} from "@/lib/agents/observability/types";
import { TraceCharts } from "./TraceCharts";

interface DailyStat {
  date: string;
  traces: number;
  tokens: number;
  cost: number;
  error_count: number;
}

interface TraceStats {
  total_traces: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_duration_ms: number;
  error_rate: number;
  daily_stats?: DailyStat[];
}

export function TraceDashboard() {
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [stats, setStats] = useState<TraceStats>({
    total_traces: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    avg_duration_ms: 0,
    error_rate: 0,
    daily_stats: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTraceSpans, setSelectedTraceSpans] = useState<AgentSpan[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TraceStatus | "all">("all");
  const [agentFilter] = useState<string>("all");

  const fetchTraces = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (agentFilter !== "all") params.append("agent_type", agentFilter);

      const res = await fetch(`/api/traces?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch traces");
      const data = await res.json();
      setTraces(data.traces || []);
    } catch (error) {
      console.error("Error fetching traces:", error);
      toast.error("Failed to load traces");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/traces/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data.stats || data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchTraceDetails = async (id: string) => {
    try {
      setIsLoadingDetails(true);
      const res = await fetch(`/api/traces/${id}`);
      if (!res.ok) throw new Error("Failed to fetch trace details");
      const data = await res.json();
      if (data.spans) setSelectedTraceSpans(data.spans);
      else if (Array.isArray(data)) setSelectedTraceSpans(data);
      else setSelectedTraceSpans([]);
    } catch (error) {
      console.error("Error fetching trace details:", error);
      toast.error("Failed to load details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchTraces();
    fetchStats();
  }, [statusFilter, agentFilter]);

  useEffect(() => {
    if (selectedTraceId) {
      fetchTraceDetails(selectedTraceId);
    }
  }, [selectedTraceId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="secondary"
            className="bg-green-500/10 text-green-500 hover:bg-green-500/20"
          >
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="secondary"
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            Error
          </Badge>
        );
      case "running":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
          >
            Running
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(cost);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Agent Traces</h2>
        <p className="text-muted-foreground">
          Monitor and debug detailed agent execution traces
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_traces.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(stats.total_cost_usd)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats.avg_duration_ms)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.error_rate * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      {stats.daily_stats && stats.daily_stats.length > 0 && (
        <TraceCharts data={stats.daily_stats} />
      )}

      {/* Filters and List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">
              Recent Visualizations
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  fetchTraces();
                  fetchStats();
                }}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && traces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : traces.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No traces found.
                  </TableCell>
                </TableRow>
              ) : (
                traces.map((trace) => (
                  <TableRow
                    key={trace.trace_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTraceId(trace.trace_id)}
                  >
                    <TableCell className="font-medium">
                      {trace.root_agent_type}
                    </TableCell>
                    <TableCell>{trace.root_action}</TableCell>
                    <TableCell>{getStatusBadge(trace.status)}</TableCell>
                    <TableCell>
                      {formatDuration(trace.total_duration_ms)}
                    </TableCell>
                    <TableCell>
                      {trace.total_tokens_in + trace.total_tokens_out}
                    </TableCell>
                    <TableCell>{formatCost(trace.total_cost_usd)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(trace.started_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedTraceId}
        onOpenChange={(open) => !open && setSelectedTraceId(null)}
      >
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Trace Details</SheetTitle>
            <SheetDescription>
              {selectedTraceId && `ID: ${selectedTraceId}`}
            </SheetDescription>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {selectedTraceSpans.map((span) => (
                <div
                  key={span.span_id}
                  className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0"
                >
                  <div
                    className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${span.status === "error" ? "bg-red-500 border-red-500" : "bg-background border-primary"}`}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {span.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(span.duration_ms || 0)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {span.agent_type.toUpperCase()} • {span.model || "System"}
                    </div>
                    {span.input_preview && (
                      <div className="text-xs bg-muted p-2 rounded mt-2 font-mono overflow-x-auto">
                        <div className="text-[10px] uppercase text-muted-foreground mb-1">
                          Input
                        </div>
                        {JSON.stringify(span.input_preview, null, 2)}
                      </div>
                    )}
                    {span.output_preview && (
                      <div className="text-xs bg-muted p-2 rounded mt-2 font-mono overflow-x-auto">
                        <div className="text-[10px] uppercase text-muted-foreground mb-1">
                          Output
                        </div>
                        {JSON.stringify(span.output_preview, null, 2)}
                      </div>
                    )}
                    {span.error_message && (
                      <div className="text-xs bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-2 rounded mt-2">
                        {span.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
