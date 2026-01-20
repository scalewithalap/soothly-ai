// Agent types per agents-ecosystem.md specification
// Renamed from legacy names to match the 8-Agent Ecosystem

// Legacy mapping for migration support:
// leads        → lead_gen (The "Hunter" - Outbound SDR)
// content      → seo (The "Traffic Engine" - Content Marketing)
// partners     → partnership (The "Recruiter" - Affiliate Scout)
// contracts    → proposal (The "Closer" - Deal Desk)
// compliance   → competitor_intel (The "Spy" - Market Strategist)
// receivables  → revenue_recovery (The "Defender" - Collections)
// spend        → onboarding (The "Guide" - Implementation)
// pricing      → customer_success (The "Brain" - Level 1 Support)

// Normal agents (available to all paid plans)
export type NormalAgentType =
  | "lead_gen"
  | "seo"
  | "partnership"
  | "proposal"
  | "competitor_intel"
  | "revenue_recovery"
  | "onboarding"
  | "customer_success";

// Legacy agent types for backwards compatibility during migration
export type LegacyAgentType =
  | "leads"
  | "content"
  | "partners"
  | "contracts"
  | "compliance"
  | "receivables"
  | "spend"
  | "pricing";

// All agent types including Superagent (yearly plans only)
export type AgentType = NormalAgentType | "superagent";

// Combined type for migration period (accepts both old and new names)
export type AnyAgentType = NormalAgentType | LegacyAgentType | "superagent";

// List of normal agent types for iteration
export const NORMAL_AGENT_TYPES: NormalAgentType[] = [
  "lead_gen",
  "seo",
  "partnership",
  "proposal",
  "competitor_intel",
  "revenue_recovery",
  "onboarding",
  "customer_success",
];

// Legacy to new agent type mapping
export const LEGACY_AGENT_TYPE_MAP: Record<LegacyAgentType, NormalAgentType> = {
  leads: "lead_gen",
  content: "seo",
  partners: "partnership",
  contracts: "proposal",
  compliance: "competitor_intel",
  receivables: "revenue_recovery",
  spend: "onboarding",
  pricing: "customer_success",
};

// Utility to normalize any agent type to the new format
export function normalizeAgentType(type: AnyAgentType): AgentType {
  if (type === "superagent") return "superagent";
  if (type in LEGACY_AGENT_TYPE_MAP) {
    return LEGACY_AGENT_TYPE_MAP[type as LegacyAgentType];
  }
  return type as NormalAgentType;
}

export interface AgentTask {
  id: string;
  action: string;
  params: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "urgent";
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  usageCount?: number;
}

export interface AgentEvent {
  id: string;
  fromAgent: AgentType;
  toAgent?: AgentType;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface UsageCost {
  [action: string]: number;
}

export interface AgentConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

// Metadata for normal agents per agents-ecosystem.md
export const AGENT_METADATA: Record<
  NormalAgentType,
  {
    displayName: string;
    role: string;
    shortDescription: string;
    longDescription: string;
  }
> = {
  lead_gen: {
    displayName: "Lead Generation Agent",
    role: 'The "Hunter"',
    shortDescription:
      "Your Outbound Sales Rep (SDR). Finds, enriches, and qualifies leads.",
    longDescription:
      "Scrapes B2B databases, enriches contacts with email validation, and pushes qualified leads to your CRM or outreach sequences automatically.",
  },
  seo: {
    displayName: "SEO Content Agent",
    role: 'The "Traffic Engine"',
    shortDescription:
      "Your 24/7 Content Marketing Manager. Researches and publishes SEO content.",
    longDescription:
      "Finds low-competition keywords, drafts high-quality articles with proper SEO structure, and publishes to your connected CMS to drive organic traffic.",
  },
  partnership: {
    displayName: "Partnership Agent",
    role: 'The "Recruiter"',
    shortDescription:
      "Your Affiliate Manager and Scout. Finds and recruits partners.",
    longDescription:
      "Scans social profiles for micro-influencers and potential affiliates, qualifies by engagement rate, and sends personalized outreach to build your partner network.",
  },
  proposal: {
    displayName: "Proposal Generator Agent",
    role: 'The "Closer"',
    shortDescription:
      "Your Deal Desk / Sales Engineer. Creates custom proposals instantly.",
    longDescription:
      "Analyzes prospect websites to understand their needs, maps their pain points to your solutions, and generates personalized PDF proposals in seconds.",
  },
  competitor_intel: {
    displayName: "Competitor Intel Agent",
    role: 'The "Spy"',
    shortDescription:
      "Your Market Strategist. Monitors competitors daily for changes.",
    longDescription:
      "Visits competitor websites daily, detects pricing changes, new features, and headline updates, and alerts you to strategic opportunities.",
  },
  revenue_recovery: {
    displayName: "Revenue Recovery Agent",
    role: 'The "Defender"',
    shortDescription:
      "Your Automated Collections Team. Recovers failed payments.",
    longDescription:
      "Detects payment failures from Stripe webhooks, identifies failure reasons, and sends personalized recovery messages via email and SMS to reduce involuntary churn.",
  },
  onboarding: {
    displayName: "Onboarding Agent",
    role: 'The "Guide"',
    shortDescription:
      "Your Implementation Specialist. Guides new users to success.",
    longDescription:
      "Creates personalized onboarding paths based on user role, sends nudge emails for incomplete steps, and reduces early churn by accelerating Time-To-Value.",
  },
  customer_success: {
    displayName: "Customer Success Agent",
    role: 'The "Brain"',
    shortDescription:
      "Your Level 1 Support Rep. Answers questions 24/7 with RAG.",
    longDescription:
      "Uses vector similarity search on your docs and past tickets to answer questions instantly, can execute safe backend actions like password resets, and escalates complex issues to humans.",
  },
};

// Metadata for Superagent (separate as it's a premium feature)
export const SUPERAGENT_METADATA = {
  displayName: "Superagent",
  role: 'The "Manager"',
  shortDescription:
    "Meta-Orchestrator. Can trigger other agents and coordinate campaigns.",
  longDescription:
    "The Superagent has access to all data generated by your agents and can coordinate multi-agent campaigns from a single prompt—like running a full 'Niche Takeover' strategy.",
};
