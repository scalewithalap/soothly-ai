/**
 * Competitor Intel Agent
 * Market Strategist that monitors competitor websites for changes
 *
 * Role: "The Spy" - Your Market Strategist
 * Trigger: Daily Cron (0 8 * * *)
 *
 * Flow:
 * 1. Monitor Step: Headless browser visit to competitor URLs
 * 2. Diff Step: Compare content hash with previous snapshot
 * 3. Alert Step: Notify on significant changes (price, features, headlines)
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { inngest } from "@/inngest/client";
import * as crypto from "crypto";

// Types of changes to detect
export type ChangeType =
  | "price_change"
  | "new_feature"
  | "feature_removed"
  | "headline_change"
  | "layout_change"
  | "content_update"
  | "unknown";

// Alert priority levels
export type AlertPriority = "low" | "medium" | "high" | "critical";

// Competitor configuration
export interface CompetitorConfig {
  id: string;
  name: string;
  url: string;
  monitoredPages: string[]; // Paths to monitor (e.g., "/pricing", "/features")
  selectors?: {
    pricing?: string;
    features?: string;
    headline?: string;
  };
  checkFrequency?: "daily" | "weekly" | "hourly";
}

// Snapshot of a competitor page
export interface PageSnapshot {
  url: string;
  contentHash: string;
  textContent: string;
  title: string;
  capturedAt: Date;
  metadata?: Record<string, unknown>;
}

// Detected change
export interface DetectedChange {
  competitorId: string;
  competitorName: string;
  pageUrl: string;
  changeType: ChangeType;
  priority: AlertPriority;
  summary: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: Date;
}

export class CompetitorIntelAgent extends BaseAgent {
  readonly name = "competitor_intel" as const;
  readonly displayName = "Competitor Intel";
  readonly description =
    "Monitors competitor websites and alerts on price, feature, and strategy changes.";

  readonly usageCost: UsageCost = {
    monitor: 2,
    analyze: 1,
    alert: 1,
  };

  // Keywords that indicate important changes
  private readonly priceKeywords = [
    "price",
    "pricing",
    "cost",
    "$",
    "€",
    "£",
    "/month",
    "/year",
    "free",
    "trial",
  ];

  private readonly featureKeywords = [
    "feature",
    "new",
    "launch",
    "introducing",
    "announce",
    "now available",
    "beta",
  ];

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    // No initialization needed
  }

  /**
   * Execute agent task based on action type
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const { action, params } = task;

    switch (action) {
      case "run_daily_scan":
        return this.runDailyScan();

      case "monitor_competitor":
        return this.monitorCompetitor(
          params as {
            competitorId: string;
          },
        );

      case "add_competitor":
        return this.addCompetitor(params as unknown as CompetitorConfig);

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Run daily scan of all competitors
   */
  async runDailyScan(): Promise<AgentResult> {
    await inngest.send({
      name: "intel/scan.daily",
      data: {
        orgId: this.orgId,
        triggeredAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      data: { status: "daily_scan_triggered" },
    };
  }

  /**
   * Monitor a specific competitor
   */
  async monitorCompetitor(params: {
    competitorId: string;
  }): Promise<AgentResult> {
    await inngest.send({
      name: "intel/competitor.check",
      data: {
        competitorId: params.competitorId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { competitorId: params.competitorId, status: "monitoring_started" },
    };
  }

  /**
   * Add a new competitor to monitor
   */
  async addCompetitor(config: CompetitorConfig): Promise<AgentResult> {
    await inngest.send({
      name: "intel/competitor.add",
      data: {
        ...config,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { competitorId: config.id, status: "competitor_added" },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate content hash for change detection
   */
  generateContentHash(content: string): string {
    // Normalize content before hashing
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "[DATE]") // Normalize dates
      .replace(/\d{1,2}:\d{2}/g, "[TIME]") // Normalize times
      .trim();

    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Compare two snapshots and detect changes
   */
  detectChanges(
    previous: PageSnapshot,
    current: PageSnapshot,
    competitorName: string,
  ): DetectedChange | null {
    // No change if hashes match
    if (previous.contentHash === current.contentHash) {
      return null;
    }

    // Analyze the type of change
    const changeType = this.classifyChange(
      previous.textContent,
      current.textContent,
    );

    const priority = this.determinePriority(changeType);

    return {
      competitorId: "", // Will be filled by caller
      competitorName,
      pageUrl: current.url,
      changeType,
      priority,
      summary: this.generateChangeSummary(changeType, current.url),
      details: this.generateChangeDetails(
        previous.textContent,
        current.textContent,
        changeType,
      ),
      previousValue: previous.textContent.substring(0, 500),
      newValue: current.textContent.substring(0, 500),
      detectedAt: new Date(),
    };
  }

  /**
   * Classify the type of change based on content
   */
  classifyChange(previousContent: string, currentContent: string): ChangeType {
    const prevLower = previousContent.toLowerCase();
    const currLower = currentContent.toLowerCase();

    // Check for price changes
    for (const keyword of this.priceKeywords) {
      const prevHas = prevLower.includes(keyword);
      const currHas = currLower.includes(keyword);
      if (
        prevHas !== currHas ||
        this.hasPriceValueChanged(prevLower, currLower)
      ) {
        return "price_change";
      }
    }

    // Check for feature changes
    for (const keyword of this.featureKeywords) {
      if (!prevLower.includes(keyword) && currLower.includes(keyword)) {
        return "new_feature";
      }
      if (prevLower.includes(keyword) && !currLower.includes(keyword)) {
        return "feature_removed";
      }
    }

    // Check for headline changes (first 100 chars)
    if (
      previousContent.substring(0, 100) !== currentContent.substring(0, 100)
    ) {
      return "headline_change";
    }

    // Default to content update
    return "content_update";
  }

  /**
   * Check if price values have changed
   */
  hasPriceValueChanged(prev: string, curr: string): boolean {
    const priceRegex =
      /\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:usd|eur|gbp)/gi;
    const prevPrices = prev.match(priceRegex) || [];
    const currPrices = curr.match(priceRegex) || [];

    if (prevPrices.length !== currPrices.length) return true;

    return prevPrices.some((p, i) => p !== currPrices[i]);
  }

  /**
   * Determine alert priority based on change type
   */
  determinePriority(changeType: ChangeType): AlertPriority {
    switch (changeType) {
      case "price_change":
        return "critical";
      case "new_feature":
      case "feature_removed":
        return "high";
      case "headline_change":
        return "medium";
      case "content_update":
      case "layout_change":
        return "low";
      default:
        return "low";
    }
  }

  /**
   * Generate a human-readable summary of the change
   */
  generateChangeSummary(changeType: ChangeType, url: string): string {
    const page = new URL(url).pathname;

    switch (changeType) {
      case "price_change":
        return `Pricing change detected on ${page}`;
      case "new_feature":
        return `New feature announced on ${page}`;
      case "feature_removed":
        return `Feature removed from ${page}`;
      case "headline_change":
        return `Headline updated on ${page}`;
      case "content_update":
        return `Content updated on ${page}`;
      default:
        return `Change detected on ${page}`;
    }
  }

  /**
   * Generate detailed change description for AI analysis
   */
  generateChangeDetails(
    prev: string,
    curr: string,
    changeType: ChangeType,
  ): string {
    // Simple diff - in production, use a proper diff library
    const prevWords = new Set(prev.split(/\s+/));
    const currWords = new Set(curr.split(/\s+/));

    const added = [...currWords].filter((w) => !prevWords.has(w)).slice(0, 20);
    const removed = [...prevWords]
      .filter((w) => !currWords.has(w))
      .slice(0, 20);

    return `Change Type: ${changeType}
Added words: ${added.join(", ") || "none"}
Removed words: ${removed.join(", ") || "none"}`;
  }

  /**
   * Build alert email content
   */
  buildAlertEmail(change: DetectedChange): { subject: string; body: string } {
    const priorityEmoji = {
      critical: "🚨",
      high: "⚠️",
      medium: "📢",
      low: "ℹ️",
    };

    return {
      subject: `${priorityEmoji[change.priority]} ${change.competitorName}: ${change.summary}`,
      body: `Competitor Intel Alert

**${change.competitorName}** has made changes:

**Change Type:** ${change.changeType.replace("_", " ")}
**Priority:** ${change.priority.toUpperCase()}
**Page:** ${change.pageUrl}

**Summary:**
${change.summary}

**Details:**
${change.details}

---
Review competitor: ${change.pageUrl}
Detected: ${change.detectedAt.toISOString()}`,
    };
  }
}
