"use client";

import { useState, useEffect } from "react";
import { useContent } from "@/hooks/use-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Plus, Trash2, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  GuardrailPolicy,
  GuardrailViolation,
  GuardrailRuleType,
} from "@/lib/agents/safety/types";

export function GuardrailEditor() {
  const { content } = useContent();
  const t = content.agentPlatform.guardrails as any;
  const common = content.agentPlatform.common as any;

  const [policies, setPolicies] = useState<GuardrailPolicy[]>([]);
  const [violations, setViolations] = useState<GuardrailViolation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("policies");

  // Create Policy State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDesc, setNewPolicyDesc] = useState("");

  async function fetchData() {
    try {
      setIsLoading(true);
      if (activeTab === "policies") {
        const res = await fetch("/api/guardrails");
        if (!res.ok) throw new Error("Failed to fetch policies");
        const data = await res.json();
        setPolicies(data);
      } else {
        const res = await fetch("/api/guardrails/violations");
        if (!res.ok) throw new Error("Failed to fetch violations");
        const data = await res.json();
        setViolations(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(common.noData);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreatePolicy = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch("/api/guardrails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPolicyName,
          description: newPolicyDesc,
          applies_to_agents: [],
          applies_to_actions: [],
          rules: [], // Start empty, rules added via edit in future
          enabled: true,
          priority: 1,
        }),
      });

      if (!res.ok) throw new Error("Failed to create policy");

      toast.success(t.toasts.created);
      setIsCreateOpen(false);
      setNewPolicyName("");
      setNewPolicyDesc("");
      fetchData();
    } catch (error) {
      console.error("Error creating policy:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      setIsProcessing(true);
      const res = await fetch(`/api/guardrails/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete policy");

      toast.success(t.toasts.deleted);
      fetchData();
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePolicy = async (policy: GuardrailPolicy) => {
    try {
      // Optimistic update
      setPolicies(
        policies.map((p) =>
          p.id === policy.id ? { ...p, enabled: !p.enabled } : p,
        ),
      );

      const res = await fetch(`/api/guardrails/${policy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !policy.enabled }),
      });

      if (!res.ok) {
        // Revert
        setPolicies(
          policies.map((p) =>
            p.id === policy.id ? { ...p, enabled: policy.enabled } : p,
          ),
        );
        throw new Error("Failed to update policy");
      }

      toast.success(t.toasts.updated);
    } catch (error) {
      console.error("Error updating policy:", error);
      toast.error(t.toasts.error);
    }
  };

  const getRuleTypeLabel = (type: GuardrailRuleType) => {
    return t.ruleTypes[type as keyof typeof t.ruleTypes] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="policies">{t.title}</TabsTrigger>
          <TabsTrigger value="violations">{t.violations.title}</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.create}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.create}</DialogTitle>
                  <DialogDescription>{t.emptyDesc}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t.name}</Label>
                    <Input
                      placeholder={t.namePlaceholder}
                      value={newPolicyName}
                      onChange={(e) => setNewPolicyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.description}</Label>
                    <Textarea
                      value={newPolicyDesc}
                      onChange={(e) => setNewPolicyDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    {common.cancel}
                  </Button>
                  <Button
                    onClick={handleCreatePolicy}
                    disabled={!newPolicyName || isProcessing}
                  >
                    {isProcessing && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    {t.create}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : policies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t.empty}</h3>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {policies.map((policy) => (
                <Card
                  key={policy.id}
                  className={policy.enabled ? "" : "opacity-75 bg-muted/20"}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {policy.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[2.5em]">
                          {policy.description || "No description"}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={() => togglePolicy(policy)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline">
                        {policy.rules.length} {t.rules}
                      </Badge>
                      <Badge variant="secondary">
                        {policy.applies_to_agents.length === 0
                          ? t.allAgents
                          : `${policy.applies_to_agents.length} Agents`}
                      </Badge>
                    </div>
                    {policy.rules.length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {policy.rules.slice(0, 2).map((r, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span>{getRuleTypeLabel(r.type)}</span>
                            <span className="font-mono text-[10px]">
                              {r.action}
                            </span>
                          </div>
                        ))}
                        {policy.rules.length > 2 && (
                          <div className="text-center pt-1">
                            +{policy.rules.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-3 flex justify-between border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Priority: {policy.priority}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8">
                        <Edit className="w-3 h-3 mr-2" /> {common.edit}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="violations" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.violations.timestamp}</TableHead>
                    <TableHead>{t.violations.policy}</TableHead>
                    <TableHead>{t.violations.rule}</TableHead>
                    <TableHead>{t.violations.action}</TableHead>
                    <TableHead>Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : violations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {t.violations.empty}
                      </TableCell>
                    </TableRow>
                  ) : (
                    violations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(v.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {v.policy_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{getRuleTypeLabel(v.rule_type)}</span>
                            <span className="text-xs text-muted-foreground">
                              {v.message}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              v.enforcement_action === "block"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {t.actions[
                              v.enforcement_action as keyof typeof t.actions
                            ] || v.enforcement_action}
                          </Badge>
                        </TableCell>
                        <TableCell className="uppercase text-xs font-bold text-muted-foreground">
                          {v.agent_type}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
