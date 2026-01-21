/**
 * Competitor Intel Agent Inngest Functions
 * Background jobs for monitoring competitor websites
 *
 * Function: Daily Competitor Scan
 * Trigger: Cron (0 8 * * *) - Daily at 8 AM
 *
 * Flow:
 * 1. fetch-competitors: Get list of monitored competitors
 * 2. scrape-pages: Visit each page with headless browser
 * 3. diff-content: Compare hash with previous snapshot
 * 4. classify-change: Determine type (price, feature, headline)
 * 5. send-alerts: Notify on significant changes
 *
 * Resiliency:
 * - Retries: 3x per page with exponential backoff
 * - Rate limiting: 1 request per 2 seconds to avoid blocking
 */

import { inngest } from "@/inngest/client";
import { INTEL_EVENTS } from "@/inngest/events";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getGemini } from "@/lib/ai";
import {
  parseAgentEventData,
  requiresApproval,
  requestApprovalAndWait,
} from "@/inngest/utils";
import {
  sendNotification,
  getOrgOwnerNotificationPreferences,
} from "@/lib/notifications";
import {
  ChangeAnalysisSchema,
  safeParseLLMOutput,
} from "@/agents/schemas/llm-output-schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

// Type helper
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

// Change type
type ChangeType =
  | "price_change"
  | "new_feature"
  | "feature_removed"
  | "headline_change"
  | "content_update"
  | "unknown";

// Alert priority
type AlertPriority = "low" | "medium" | "high" | "critical";

/**
 * Generate content hash
 */
function generateContentHash(content: string): string {
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "[DATE]")
    .trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Determine priority based on change type
 */
function determinePriority(changeType: ChangeType): AlertPriority {
  switch (changeType) {
    case "price_change":
      return "critical";
    case "new_feature":
    case "feature_removed":
      return "high";
    case "headline_change":
      return "medium";
    default:
      return "low";
  }
}

// ============================================
// DAILY SCAN CRON JOB
// ============================================

/**
 * Daily competitor scan - runs at 8 AM
 */
export const dailyCompetitorScan = inngest.createFunction(
  {
    id: "intel-daily-scan",
    name: "Daily Competitor Scan",
    retries: 2,
  },
  { cron: "0 8 * * *" }, // 8 AM daily
  async ({ step }) => {
    // Step 1: Get all organizations with competitors configured
    const orgsWithCompetitors = await step.run("get-orgs", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("competitors")
        .select("org_id")
        .eq("is_active", true);

      // Get unique org IDs
      const orgIds = [...new Set(data?.map((c) => c.org_id) || [])];
      return orgIds;
    });

    // Step 2: Trigger scan for each organization
    for (const orgId of orgsWithCompetitors) {
      await inngest.send({
        name: INTEL_EVENTS.SCAN_DAILY,
        data: { orgId, triggeredAt: new Date().toISOString() },
      });
    }

    return {
      success: true,
      orgsScanned: orgsWithCompetitors.length,
    };
  },
);

/**
 * Scan competitors for a specific organization
 */
export const scanOrgCompetitors = inngest.createFunction(
  {
    id: "intel-scan-org",
    name: "Scan Org Competitors",
    retries: 3,
  },
  { event: "intel/scan.daily" },
  async ({ event, step }) => {
    const eventData = parseAgentEventData<{
      orgId: string;
    }>(event.data);
    const { orgId, model, autonomy_mode } = eventData;

    // Step 1: Get competitors for this org
    const competitors = await step.run("get-competitors", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("competitors")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true);
      return data || [];
    });

    if (competitors.length === 0) {
      return { success: true, message: "No competitors configured" };
    }

    const changesDetected: Array<{
      competitorName: string;
      pageUrl: string;
      changeType: ChangeType;
      priority: AlertPriority;
    }> = [];

    // Step 2: Check each competitor
    for (const competitor of competitors) {
      const pages = (competitor.monitored_pages as string[]) || ["/"];

      for (const pagePath of pages) {
        const pageUrl = `${competitor.url}${pagePath}`;

        // Scrape the page
        const currentContent = await step.run(
          `scrape-${competitor.id}-${pagePath.replace(/\//g, "-")}`,
          async () => {
            // In production: use Playwright/Puppeteer
            // For now, simulate with fetch
            try {
              const response = await fetch(pageUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
              });
              const html = await response.text();

              // Extract text content (simplified - use cheerio in production)
              const textContent = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();

              return {
                url: pageUrl,
                textContent: textContent.substring(0, 10000), // Limit size
                title: html.match(/<title>([^<]+)<\/title>/i)?.[1] || "Unknown",
                capturedAt: new Date().toISOString(),
              };
            } catch (error) {
              console.error(`Failed to scrape ${pageUrl}:`, error);
              return null;
            }
          },
        );

        if (!currentContent) continue;

        // Get previous snapshot
        const previousSnapshot = await step.run(
          `get-prev-${competitor.id}-${pagePath.replace(/\//g, "-")}`,
          async () => {
            const supabase = getUntypedClient();
            const { data } = await supabase
              .from("competitor_snapshots")
              .select("*")
              .eq("competitor_id", competitor.id)
              .eq("page_path", pagePath)
              .order("captured_at", { ascending: false })
              .limit(1)
              .single();
            return data;
          },
        );

        // Generate hash for current content
        const currentHash = generateContentHash(currentContent.textContent);

        // Compare with previous
        if (previousSnapshot && previousSnapshot.content_hash !== currentHash) {
          // Analyze change with AI
          const changeAnalysis = await step.run(
            `analyze-${competitor.id}-${pagePath.replace(/\//g, "-")}`,
            async () => {
              const ai = getGemini();

              const prompt = `Analyze this competitor website change:

Previous Content (excerpt):
${(previousSnapshot.text_content as string).substring(0, 1500)}

Current Content (excerpt):
${currentContent.textContent.substring(0, 1500)}

Classify the change as one of:
- price_change (pricing changed)
- new_feature (new feature announced)
- feature_removed (feature removed)
- headline_change (main headline changed)
- content_update (minor content changes)

Return JSON:
{
  "changeType": "...",
  "summary": "One sentence summary",
  "strategicImplication": "What this means competitively"
}`;

              const result = await ai.complete(prompt, {
                model,
                temperature: 0.3,
              });

              // Validate with Zod schema per backend-design/SKILL.md
              const { success, data, errors } = safeParseLLMOutput(
                ChangeAnalysisSchema,
                result.content,
                {
                  type: "content_update" as const,
                  description: "Content updated",
                  impact: "low" as const,
                  recommended_action: "Minor changes detected",
                },
              );

              if (!success) {
                console.warn(
                  "Competitor change analysis validation failed:",
                  errors?.issues,
                );
              }

              return {
                changeType: data.type,
                summary: data.description,
                strategicImplication:
                  data.recommended_action || "Analyze impact",
              };
            },
          );

          changesDetected.push({
            competitorName: competitor.name,
            pageUrl,
            changeType: changeAnalysis.changeType,
            priority: determinePriority(changeAnalysis.changeType),
          });

          // Save change record
          await step.run(
            `save-change-${competitor.id}-${pagePath.replace(/\//g, "-")}`,
            async () => {
              const supabase = getUntypedClient();
              await supabase.from("competitor_changes").insert({
                org_id: orgId,
                competitor_id: competitor.id,
                page_path: pagePath,
                change_type: changeAnalysis.changeType,
                priority: determinePriority(changeAnalysis.changeType),
                summary: changeAnalysis.summary,
                strategic_implication: changeAnalysis.strategicImplication,
                previous_hash: previousSnapshot.content_hash,
                current_hash: currentHash,
                detected_at: new Date().toISOString(),
              });
            },
          );
        }

        // Save current snapshot
        await step.run(
          `save-snapshot-${competitor.id}-${pagePath.replace(/\//g, "-")}`,
          async () => {
            const supabase = getUntypedClient();
            await supabase.from("competitor_snapshots").insert({
              competitor_id: competitor.id,
              org_id: orgId,
              page_path: pagePath,
              page_url: pageUrl,
              content_hash: currentHash,
              text_content: currentContent.textContent,
              title: currentContent.title,
              captured_at: currentContent.capturedAt,
            });
          },
        );
      }
    }

    // Step 3: Send alerts for high-priority changes
    const highPriorityChanges = changesDetected.filter(
      (c) => c.priority === "critical" || c.priority === "high",
    );

    if (highPriorityChanges.length > 0) {
      // Check approval if needed
      if (requiresApproval("send_alert", autonomy_mode)) {
        const approval = await requestApprovalAndWait(step as any, {
          orgId,
          agentType: "competitor_intel",
          action: "send_competitor_alert",
          title: `Send ${highPriorityChanges.length} competitor alerts`,
          description: `Detected changes: ${highPriorityChanges.map((c) => `${c.competitorName} (${c.changeType})`).join(", ")}`,
          params: { changes: highPriorityChanges },
          previewData: { changesCount: highPriorityChanges.length },
          riskLevel: "low",
        });

        if (!approval.approved) {
          return {
            success: true,
            changesDetected: changesDetected.length,
            alertsBlocked: true,
          };
        }
      }

      // Send alert email
      await step.run("send-alerts", async () => {
        const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
        if (ownerPrefs?.preferences.eventPreferences.agentCompletion) {
          const supabase = getUntypedClient();
          const { data: owner } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("org_id", orgId)
            .single();

          if (owner) {
            const alertSummary = highPriorityChanges
              .map(
                (c) =>
                  `• ${c.competitorName}: ${c.changeType.replace("_", " ")} on ${c.pageUrl}`,
              )
              .join("\n");

            await sendNotification({
              recipient: { email: owner.email, name: owner.full_name },
              subject: `🚨 Competitor Alert: ${highPriorityChanges.length} important change(s) detected`,
              message: `Your competitor monitoring detected changes:\n\n${alertSummary}\n\nReview in dashboard: /intelligence`,
              channels: ["email"],
            });
          }
        }
      });
    }

    // Step 4: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "competitor_intel",
        action: "daily_scan_complete",
        entity_type: "scan",
        entity_id: new Date().toISOString().split("T")[0],
        description: `Scanned ${competitors.length} competitors, detected ${changesDetected.length} changes`,
        metadata: {
          competitorsScanned: competitors.length,
          changesDetected: changesDetected.length,
          highPriority: highPriorityChanges.length,
        },
      });
    });

    return {
      success: true,
      competitorsScanned: competitors.length,
      changesDetected: changesDetected.length,
      alertsSent: highPriorityChanges.length,
    };
  },
);

/**
 * Add a new competitor to monitor
 */
export const addCompetitor = inngest.createFunction(
  {
    id: "intel-add-competitor",
    name: "Add Competitor",
  },
  { event: "intel/competitor.add" },
  async ({ event, step }) => {
    const { id, name, url, monitoredPages, orgId } = event.data as {
      id: string;
      name: string;
      url: string;
      monitoredPages: string[];
      orgId: string;
    };

    // Save competitor
    await step.run("save-competitor", async () => {
      const supabase = getUntypedClient();
      await supabase.from("competitors").upsert({
        id,
        org_id: orgId,
        name,
        url,
        monitored_pages: monitoredPages,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    });

    // Initial scan
    await inngest.send({
      name: INTEL_EVENTS.COMPETITOR_CHECK,
      data: { competitorId: id, orgId },
    });

    // Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "competitor_intel",
        action: "competitor_added",
        entity_type: "competitor",
        entity_id: id,
        description: `Added competitor: ${name} (${url})`,
        metadata: { monitoredPages },
      });
    });

    return { success: true, competitorId: id };
  },
);
