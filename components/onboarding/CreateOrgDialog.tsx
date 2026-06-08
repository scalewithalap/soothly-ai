"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LanguageContext } from "@/context/language-context";

interface CreateOrgDialogProps {
  open: boolean;
  onComplete?: () => void;
}

const INDUSTRIES = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "education", label: "Education" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

export function CreateOrgDialog({ open, onComplete }: CreateOrgDialogProps) {
  const router = useRouter();
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.onboarding?.createOrg || {}) as Record<
    string,
    string
  >;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    companySize: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t.nameRequired || "Organization name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/organization/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to create organization");
      }

      toast.success(t.success || "Organization created successfully!");
      onComplete?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to setup org:", error);
      toast.error(t.error || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#9382FF]/20 dark:bg-[#9382FF]/30">
              <Building2 className="w-5 h-5 text-[#9382FF] dark:text-[#9382FF]" />
            </div>
            <DialogTitle className="text-xl">
              {t.title || "Set Up Your Organization"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t.description ||
              "Tell us about your organization to get started with Soothly AI."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.nameLabel || "Organization Name"} *</Label>
            <Input
              id="name"
              placeholder={t.namePlaceholder || "e.g., Acme Inc"}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">{t.industryLabel || "Industry"}</Label>
            <Select
              value={formData.industry}
              onValueChange={(value) =>
                setFormData({ ...formData, industry: value })
              }
            >
              <SelectTrigger id="industry">
                <SelectValue
                  placeholder={t.industryPlaceholder || "Select your industry"}
                />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">{t.sizeLabel || "Company Size"}</Label>
            <Select
              value={formData.companySize}
              onValueChange={(value) =>
                setFormData({ ...formData, companySize: value })
              }
            >
              <SelectTrigger id="size">
                <SelectValue
                  placeholder={t.sizePlaceholder || "Select company size"}
                />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.creating || "Creating..."}
              </>
            ) : (
              t.submit || "Create Organization"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
