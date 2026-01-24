"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Plus,
  Search,
  Play,
  Pause,
  StopCircle,
} from "lucide-react";
import { Sequence, SequenceStatus } from "@/lib/sequences/types";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { toast } from "sonner";

interface SequenceListProps {
  initialSequences?: Sequence[];
}

export function SequenceList({ initialSequences = [] }: SequenceListProps) {
  const router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>(initialSequences);
  const [isLoading, setIsLoading] = useState(!initialSequences.length);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSequences = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/sequences");
      const data = await res.json();
      if (data.success) {
        setSequences(data.data);
      }
    } catch (_error) {
      console.error("Failed to fetch sequences:", _error);
      toast.error("Failed to load sequences");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSequences.length) {
      fetchSequences();
    }
  }, []);

  const handleStatusChange = async (id: string, newStatus: SequenceStatus) => {
    try {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSequences(
          sequences.map((seq) =>
            seq.id === id ? { ...seq, status: newStatus } : seq,
          ),
        );
        toast.success(`Sequence ${newStatus}`);
      }
    } catch (_error) {
      toast.error("Failed to update status");
    }
  };

  const filteredSequences = sequences.filter((seq) =>
    seq.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusColor = (status: SequenceStatus) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "draft":
        return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20";
      case "archived":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sequences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <Button onClick={() => router.push("/sequences/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Sequence
        </Button>
      </div>

      <GlassCard className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {isLoading ? "Loading..." : "No sequences found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSequences.map((sequence) => (
                <TableRow
                  key={sequence.id}
                  className="hover:bg-white/5 border-white/10"
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-base font-semibold">
                        {sequence.name}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {sequence.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getStatusColor(sequence.status)}
                    >
                      {sequence.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-4 text-sm text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-foreground">
                          {sequence.stats?.active || 0}
                        </span>
                        <span className="text-[10px]">Active</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-foreground">
                          {((sequence.stats?.openRate || 0) * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px]">Open Rate</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-foreground">
                          {((sequence.stats?.replyRate || 0) * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px]">Reply Rate</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(sequence.updatedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-white/10"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/sequences/${sequence.id}`)
                          }
                        >
                          Edit Sequence
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/sequences/${sequence.id}/enrollments`)
                          }
                        >
                          Manage Enrollments
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {sequence.status === "active" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(sequence.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" /> Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(sequence.id, "active")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            handleStatusChange(sequence.id, "archived")
                          }
                        >
                          <StopCircle className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
