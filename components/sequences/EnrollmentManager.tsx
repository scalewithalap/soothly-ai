"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  MoreHorizontal,
  Pause,
  Play,
  UserMinus,
  UserPlus,
  RotateCw,
} from "lucide-react";
import { Enrollment, EnrollmentStatus } from "@/lib/sequences/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EnrollmentManagerProps {
  sequenceId: string;
}

export function EnrollmentManager({ sequenceId }: EnrollmentManagerProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);
  const [bulkEnrollInput, setBulkEnrollInput] = useState("");

  const fetchEnrollments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/sequences/${sequenceId}/enrollments?limit=100`,
      );
      const data = await res.json();
      if (data.success) {
        setEnrollments(data.data);
      }
    } catch (_error) {
      console.error("Failed to fetch enrollments:", _error);
      toast.error("Failed to load enrollments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [sequenceId]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(enrollments.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: "pause" | "resume" | "remove") => {
    if (selectedIds.size === 0) return;

    try {
      setIsBulkLoading(true);
      const res = await fetch(`/api/sequences/${sequenceId}/enrollments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          enrollmentIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Processed ${data.data.succeeded} enrollments`);
        fetchEnrollments();
        setSelectedIds(new Set());
      }
    } catch (_error) {
      toast.error("Bulk action failed");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkEnroll = async () => {
    try {
      setIsBulkLoading(true);
      // Parse emails from text area (simple CSV or newline)
      const emails = bulkEnrollInput
        .split(/[\n,]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@")); // Basic validation

      if (emails.length === 0) {
        toast.error("No valid emails found");
        return;
      }

      const contacts = emails.map((email) => ({ email }));

      const res = await fetch(`/api/sequences/${sequenceId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `Enrolled: ${data.data.enrolled}, Skipped: ${data.data.skipped}, Errors: ${data.data.errors.length}`,
        );
        setBulkEnrollOpen(false);
        setBulkEnrollInput("");
        fetchEnrollments();
      } else {
        throw new Error(data.error?.message || "Failed to enroll");
      }
    } catch (_error) {
      toast.error("Failed to enroll contacts");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.contactData.firstName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      e.contactData.lastName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status: EnrollmentStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Completed
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Paused
          </Badge>
        );
      case "bounced":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            Bounced
          </Badge>
        );
      case "unsubscribed":
        return <Badge variant="secondary">Unsubscribed</Badge>;
      case "replied":
        return (
          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
            Replied
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search enrollments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 filter-none">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkAction("pause")}
                disabled={isBulkLoading}
              >
                <Pause className="mr-2 h-3 w-3" /> Pause ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkAction("resume")}
                disabled={isBulkLoading}
              >
                <Play className="mr-2 h-3 w-3" /> Resume ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction("remove")}
                disabled={isBulkLoading}
              >
                <UserMinus className="mr-2 h-3 w-3" /> Remove (
                {selectedIds.size})
              </Button>
            </div>
          )}
        </div>

        <Dialog open={bulkEnrollOpen} onOpenChange={setBulkEnrollOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Enroll Contacts
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bulk Enroll Contacts</DialogTitle>
              <DialogDescription>
                Enter email addresses to enroll in this sequence. Separate with
                commas or new lines.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder="john@example.com, jane@example.com"
                  className="min-h-[150px]"
                  value={bulkEnrollInput}
                  onChange={(e) => setBulkEnrollInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Note: Duplicate enrollments will be skipped automatically.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleBulkEnroll}
                disabled={isBulkLoading}
              >
                {isBulkLoading && (
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enroll Contacts
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    filteredEnrollments.length > 0 &&
                    selectedIds.size === filteredEnrollments.length
                  }
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Next Send</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEnrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {isLoading ? "Loading..." : "No enrollments found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEnrollments.map((enrollment) => (
                <TableRow
                  key={enrollment.id}
                  className="hover:bg-white/5 border-white/10"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(enrollment.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(enrollment.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {enrollment.contactEmail}
                      </span>
                      {enrollment.contactData.firstName && (
                        <span className="text-xs text-muted-foreground">
                          {enrollment.contactData.firstName}{" "}
                          {enrollment.contactData.lastName}
                          {enrollment.contactData.company &&
                            ` • ${enrollment.contactData.company}`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        Step {enrollment.currentStep + 1}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {enrollment.nextSendAt
                      ? formatDistanceToNow(new Date(enrollment.nextSendAt), {
                          addSuffix: true,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {enrollment.status === "active" ? (
                          <DropdownMenuItem onClick={() => {}}>
                            Pause Enrollment
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => {}}>
                            Resume Enrollment
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          Remove
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
