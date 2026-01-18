/**
 * Memory Explorer UI
 *
 * Admin interface for browsing and managing agent memories.
 */

"use client";

import { useState, useEffect } from "react";
import { useContent } from "@/hooks/use-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Brain,
  Database,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemoryRecord {
  id: string;
  agent_type: string;
  memory_type: "episodic" | "semantic" | "procedural";
  content: string;
  importance: number;
  created_at: string;
  accessed_at: string;
  metadata?: Record<string, unknown>;
}

export function MemoryExplorer() {
  const { content } = useContent();
  // Cast to any to bypass TypeScript inference issues with i18n
  const t = (content.agentPlatform as any)?.memory as
    | Record<string, string>
    | undefined;
  const common = (content.agentPlatform as any)?.common as
    | Record<string, string>
    | undefined;

  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(
    null,
  );
  const [stats, setStats] = useState<{
    total: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    fetchMemories();
  }, [agentFilter, typeFilter]);

  const fetchMemories = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.append("agent_type", agentFilter);
      if (typeFilter !== "all") params.append("memory_type", typeFilter);

      const res = await fetch(`/api/memories?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch memories");
      const data = await res.json();
      setMemories(data.memories || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error("Error fetching memories:", error);
      toast.error(t?.error || "Failed to load memories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMemories();
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/memories/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 50 }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error(t?.searchError || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(t?.deleted || "Memory deleted");
      fetchMemories();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t?.deleteError || "Failed to delete memory");
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "episodic":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
            {t?.episodic || "Episodic"}
          </Badge>
        );
      case "semantic":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            {t?.semantic || "Semantic"}
          </Badge>
        );
      case "procedural":
        return (
          <Badge
            variant="secondary"
            className="bg-purple-500/10 text-purple-500"
          >
            {t?.procedural || "Procedural"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 0.8) return "text-red-500";
    if (importance >= 0.5) return "text-yellow-500";
    return "text-gray-500";
  };

  const filteredMemories = memories.filter((m) =>
    searchQuery
      ? m.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {t?.title || "Memory Explorer"}
        </h2>
        <p className="text-muted-foreground">
          {t?.subtitle || "Browse and manage agent memory stores"}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" />
                {t?.totalMemories || "Total Memories"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t?.episodic || "Episodic"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {stats.byType?.episodic || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t?.semantic || "Semantic"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.byType?.semantic || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t?.procedural || "Procedural"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                {stats.byType?.procedural || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t?.searchPlaceholder || "Search memories..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t?.allAgents || "All Agents"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t?.allAgents || "All Agents"}
                </SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="partners">Partners</SelectItem>
                <SelectItem value="contracts">Contracts</SelectItem>
                <SelectItem value="superagent">Superagent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t?.allTypes || "All Types"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t?.allTypes || "All Types"}
                </SelectItem>
                <SelectItem value="episodic">
                  {t?.episodic || "Episodic"}
                </SelectItem>
                <SelectItem value="semantic">
                  {t?.semantic || "Semantic"}
                </SelectItem>
                <SelectItem value="procedural">
                  {t?.procedural || "Procedural"}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchMemories}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {common?.refresh || "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {t?.memories || "Memories"}
          </CardTitle>
          <CardDescription>
            {t?.memoryCount?.replace(
              "{count}",
              String(filteredMemories.length),
            ) || `${filteredMemories.length} memories found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">
                {t?.empty || "No memories found"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t?.emptyDesc ||
                  "Agent memories will appear here as they learn"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t?.agent || "Agent"}</TableHead>
                    <TableHead>{t?.type || "Type"}</TableHead>
                    <TableHead className="max-w-[300px]">
                      {t?.content || "Content"}
                    </TableHead>
                    <TableHead>{t?.importance || "Importance"}</TableHead>
                    <TableHead>{t?.created || "Created"}</TableHead>
                    <TableHead className="text-right">
                      {common?.actions || "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMemories.map((memory) => (
                    <TableRow key={memory.id}>
                      <TableCell className="font-medium">
                        {memory.agent_type.toUpperCase()}
                      </TableCell>
                      <TableCell>{getTypeBadge(memory.memory_type)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {memory.content}
                      </TableCell>
                      <TableCell>
                        <span className={getImportanceColor(memory.importance)}>
                          {(memory.importance * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(memory.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMemory(memory)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(memory.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Detail Dialog */}
      <Dialog
        open={!!selectedMemory}
        onOpenChange={(open) => !open && setSelectedMemory(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t?.memoryDetails || "Memory Details"}</DialogTitle>
            <DialogDescription>
              {selectedMemory?.agent_type.toUpperCase()} -{" "}
              {selectedMemory?.memory_type}
            </DialogDescription>
          </DialogHeader>
          {selectedMemory && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t?.content || "Content"}
                </label>
                <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedMemory.content}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t?.importance || "Importance"}
                  </label>
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${selectedMemory.importance * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {(selectedMemory.importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t?.lastAccessed || "Last Accessed"}
                  </label>
                  <div className="mt-1 text-sm">
                    {formatDistanceToNow(new Date(selectedMemory.accessed_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
              {selectedMemory.metadata &&
                Object.keys(selectedMemory.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t?.metadata || "Metadata"}
                    </label>
                    <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-[200px]">
                      {JSON.stringify(selectedMemory.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

