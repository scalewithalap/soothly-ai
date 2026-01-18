"use client";

/**
 * Onboarding Wizard Page
 *
 * Multi-step onboarding for new users.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Building2,
  Bot,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { content } = useContent();
  const t = content.platform?.onboarding || {};
  const steps = t.steps || {};
  const buttons = t.buttons || {};
  const step1 = t.step1 || {};
  const step2 = t.step2 || {};
  const step3 = t.step3 || {};
  const step4 = t.step4 || {};
  const toasts = t.toasts || {};

  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [agentName, setAgentName] = useState(
    step3.defaultAgentName || "My First Agent",
  );
  const [agentGoal, setAgentGoal] = useState("");

  const STEPS = [
    { id: 0, title: steps.profile || "Profile", icon: User },
    { id: 1, title: steps.organization || "Organization", icon: Building2 },
    { id: 2, title: steps.firstAgent || "First Agent", icon: Bot },
    { id: 3, title: steps.complete || "Complete", icon: CheckCircle },
  ];

  useEffect(() => {
    // Load current user data
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.onboarding_completed) {
            router.push("/dashboard");
            return;
          }
          setFullName(data.user?.full_name || "");
          setStep(data.user?.onboarding_step || 0);
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [router]);

  const saveProgress = async (nextStep: number, complete = false) => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: nextStep,
          completed: complete,
          data: {
            full_name: fullName,
            job_title: jobTitle,
            org_name: orgName,
            industry: industry,
            first_agent_name: agentName,
            first_agent_goal: agentGoal,
          },
        }),
      });

      if (res.ok) {
        if (complete) {
          toast.success(toasts.welcome || "Welcome to Zero Headache! 🎉");
          router.push("/dashboard");
        } else {
          setStep(nextStep);
        }
      } else {
        toast.error(toasts.saveFailed || "Failed to save progress");
      }
    } catch {
      toast.error(toasts.saveFailed || "Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 3) {
      saveProgress(3, true);
    } else {
      saveProgress(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#9382FF]/10 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#9382FF]/10 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-xl w-full p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  i <= step
                    ? "bg-[#9382FF] text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                }`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 h-1 mx-1 ${
                    i < step ? "bg-[#9382FF]" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[250px]">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                {step1.title || "Tell us about yourself"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {step1.description || "Let's personalize your experience"}
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullName">
                    {step1.labels?.fullName || "Full Name"}
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={step1.placeholders?.fullName || "John Doe"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">
                    {step1.labels?.jobTitle || "Job Title"}
                  </Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={
                      step1.placeholders?.jobTitle ||
                      "Founder, CEO, Marketing Lead..."
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                {step2.title || "Your Organization"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {step2.description || "Help us understand your business"}
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="orgName">
                    {step2.labels?.orgName || "Organization Name"}
                  </Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={step2.placeholders?.orgName || "Acme Inc."}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="industry">
                    {step2.labels?.industry || "Industry"}
                  </Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder={
                      step2.placeholders?.industry ||
                      "E-commerce, SaaS, Agency..."
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                {step3.title || "Create Your First Agent"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {step3.description || "What do you want to automate?"}
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="agentName">
                    {step3.labels?.agentName || "Agent Name"}
                  </Label>
                  <Input
                    id="agentName"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder={
                      step3.placeholders?.agentName ||
                      "Lead Generator, Content Writer..."
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="agentGoal">
                    {step3.labels?.agentGoal || "What should it do?"}
                  </Label>
                  <Input
                    id="agentGoal"
                    value={agentGoal}
                    onChange={(e) => setAgentGoal(e.target.value)}
                    placeholder={
                      step3.placeholders?.agentGoal ||
                      "Find leads, write blog posts..."
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">
                {step4.title || "You're all set!"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {step4.description ||
                  "Your workspace is ready. Let's start automating your business with AI agents."}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 0 || saving}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {buttons.back || "Back"}
          </Button>
          <Button onClick={nextStep} disabled={saving} className="gap-2">
            {step === 3
              ? buttons.getStarted || "Get Started"
              : buttons.continue || "Continue"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
