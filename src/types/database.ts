export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          industry: string | null;
          company_size: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
          timezone: string;
          settings: Json;
          subscription_tier: "starter" | "growth" | "scale" | "enterprise";
          subscription_status: "trialing" | "active" | "past_due" | "canceled";
          paddle_customer_id: string | null;
          paddle_subscription_id: string | null;
          trial_ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          industry?: string | null;
          company_size?:
            | "1-10"
            | "11-50"
            | "51-200"
            | "201-500"
            | "500+"
            | null;
          timezone?: string;
          settings?: Json;
          subscription_tier?: "starter" | "growth" | "scale" | "enterprise";
          subscription_status?: "trialing" | "active" | "past_due" | "canceled";
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          trial_ends_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain?: string | null;
          industry?: string | null;
          company_size?:
            | "1-10"
            | "11-50"
            | "51-200"
            | "201-500"
            | "500+"
            | null;
          timezone?: string;
          settings?: Json;
          subscription_tier?: "starter" | "growth" | "scale" | "enterprise";
          subscription_status?: "trialing" | "active" | "past_due" | "canceled";
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          trial_ends_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          org_id: string | null;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "owner" | "admin" | "member";
          preferences: Json;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id?: string | null;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "admin" | "member";
          preferences?: Json;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "admin" | "member";
          preferences?: Json;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_ledger: {
        Row: {
          id: string;
          org_id: string;
          agent_type: string;
          action: string;
          amount: number;
          balance_after: number;
          reference_id: string | null;
          reference_type: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_type: string;
          action: string;
          amount: number;
          balance_after: number;
          reference_id?: string | null;
          reference_type?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_type?: string;
          action?: string;
          amount?: number;
          balance_after?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      agent_configs: {
        Row: {
          id: string;
          org_id: string;
          agent_type: string;
          enabled: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_type: string;
          enabled?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_type?: string;
          enabled?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          org_id: string;
          provider: string;
          credentials: Json | null;
          status: "active" | "inactive" | "error";
          last_used_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          provider: string;
          credentials?: Json | null;
          status?: "active" | "inactive" | "error";
          last_used_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          provider?: string;
          credentials?: Json | null;
          status?: "active" | "inactive" | "error";
          last_used_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: "admin" | "member";
          invited_by: string;
          token: string;
          expires_at: string;
          status: "pending" | "accepted" | "expired" | "revoked";
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: "admin" | "member";
          invited_by: string;
          token?: string;
          expires_at?: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: "admin" | "member";
          invited_by?: string;
          token?: string;
          expires_at?: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          created_at?: string;
        };
      };
    };
    Views: {
      organization_credits: {
        Row: {
          org_id: string;
          total_credits: number;
          total_added: number;
          total_used: number;
        };
      };
    };
    Functions: {
      get_credit_balance: {
        Args: { p_org_id: string };
        Returns: number;
      };
      deduct_credits: {
        Args: {
          p_org_id: string;
          p_agent_type: string;
          p_action: string;
          p_amount: number;
          p_reference_id?: string | null;
          p_reference_type?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      add_credits: {
        Args: {
          p_org_id: string;
          p_amount: number;
          p_reason: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ============================================
// PHASE 2: SHARED TABLES
// ============================================

export interface CompanyRow {
  id: string;
  org_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  logo_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  description: string | null;
  employees_count: number | null;
  revenue_range: string | null;
  location_city: string | null;
  location_country: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  org_id: string;
  company_id: string | null;
  type: "lead" | "partner" | "client" | "other";
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  avatar_url: string | null;
  source: string | null;
  source_details: Json;
  score: number;
  status: string;
  tags: string[];
  last_contacted_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  org_id: string;
  agent_type: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  description: string | null;
  metadata: Json;
  created_at: string;
}

// ============================================
// PHASE 2: LEAD GENERATION TABLES
// ============================================

export interface LeadCampaignRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  target_criteria: Json;
  scraping_sources: string[];
  enrichment_enabled: boolean;
  scoring_model: string;
  daily_limit: number;
  leads_collected: number;
  leads_qualified: number;
  leads_contacted: number;
  started_at: string | null;
  completed_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface LeadContactRow {
  id: string;
  org_id: string;
  contact_id: string;
  campaign_id: string | null;
  enrichment_status: "pending" | "processing" | "completed" | "failed";
  enriched_at: string | null;
  enrichment_source: string | null;
  enrichment_data: Json;
  lead_score: number;
  score_breakdown: Json;
  qualification_status:
    | "unqualified"
    | "mql"
    | "sql"
    | "opportunity"
    | "customer"
    | "lost";
  outreach_status:
    | "pending"
    | "scheduled"
    | "sent"
    | "opened"
    | "clicked"
    | "replied"
    | "bounced"
    | "unsubscribed";
  outreach_sequence_id: string | null;
  emails_sent: number;
  emails_opened: number;
  links_clicked: number;
  last_email_sent_at: string | null;
  last_opened_at: string | null;
  last_replied_at: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface OutreachSequenceRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "archived";
  trigger_type: "manual" | "on_qualification" | "on_score" | "scheduled";
  trigger_config: Json;
  steps: Json;
  total_enrolled: number;
  total_completed: number;
  conversion_rate: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface OutreachEmailRow {
  id: string;
  org_id: string;
  lead_contact_id: string;
  sequence_id: string | null;
  step_number: number;
  subject: string;
  body: string;
  from_email: string;
  to_email: string;
  status:
    | "pending"
    | "scheduled"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "replied"
    | "bounced"
    | "failed";
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  open_count: number;
  click_count: number;
  error_message: string | null;
  metadata: Json;
  created_at: string;
}

// ============================================
// PHASE 2: SEO CONTENT TABLES
// ============================================

export interface ContentBriefRow {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status:
    | "draft"
    | "researching"
    | "approved"
    | "in_progress"
    | "review"
    | "published"
    | "archived";
  target_audience: string | null;
  buyer_persona: Json;
  primary_keyword: string | null;
  secondary_keywords: string[];
  target_word_count: number;
  content_type:
    | "blog_post"
    | "landing_page"
    | "guide"
    | "case_study"
    | "whitepaper"
    | "product_page";
  competitor_urls: string[];
  research_notes: string | null;
  outline: Json;
  due_date: string | null;
  publish_date: string | null;
  assigned_to: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ArticleRow {
  id: string;
  org_id: string;
  brief_id: string | null;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  html_content: string | null;
  version: number;
  parent_version_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  word_count: number;
  readability_score: number | null;
  seo_score: number;
  seo_issues: Json;
  seo_suggestions: Json;
  status:
    | "draft"
    | "optimizing"
    | "review"
    | "approved"
    | "scheduled"
    | "published"
    | "archived";
  published_at: string | null;
  published_url: string | null;
  page_views: number;
  avg_time_on_page: number;
  bounce_rate: number | null;
  organic_traffic: number;
  keyword_rankings: Json;
  ai_model: string | null;
  ai_prompt_tokens: number;
  ai_completion_tokens: number;
  generation_cost: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface KeywordRow {
  id: string;
  org_id: string;
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  competition_level: "low" | "medium" | "high" | null;
  current_position: number | null;
  previous_position: number | null;
  best_position: number | null;
  position_change: number;
  target_url: string | null;
  article_id: string | null;
  is_primary: boolean;
  serp_features: string[];
  status: "discovered" | "tracking" | "targeted" | "ranking" | "archived";
  last_checked_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ============================================
// PHASE 2: PARTNERSHIP TABLES
// ============================================

export interface PartnerRow {
  id: string;
  org_id: string;
  company_id: string | null;
  contact_id: string | null;
  name: string;
  type:
    | "affiliate"
    | "integration"
    | "reseller"
    | "referral"
    | "strategic"
    | "other";
  status:
    | "prospect"
    | "contacted"
    | "negotiating"
    | "active"
    | "inactive"
    | "churned";
  tier: "standard" | "silver" | "gold" | "platinum";
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  fit_score: number;
  fit_breakdown: Json;
  commission_rate: number | null;
  commission_type: "percentage" | "flat" | "tiered" | null;
  contract_start: string | null;
  contract_end: string | null;
  terms: Json;
  total_referrals: number;
  total_revenue: number;
  total_commissions_paid: number;
  conversion_rate: number;
  integration_type: string | null;
  api_enabled: boolean;
  documentation_url: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PartnerOutreachRow {
  id: string;
  org_id: string;
  partner_id: string;
  type: "email" | "linkedin" | "phone" | "meeting" | "other";
  subject: string | null;
  content: string | null;
  status:
    | "pending"
    | "sent"
    | "delivered"
    | "opened"
    | "replied"
    | "meeting_scheduled"
    | "no_response"
    | "declined";
  scheduled_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  response_content: string | null;
  response_sentiment: "positive" | "neutral" | "negative" | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  template_id: string | null;
  personalization_data: Json;
  sent_by: string | null;
  metadata: Json;
  created_at: string;
}

// Helper types for easier access
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type Updatable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Specific exports - Core tables
export type Organization = Tables<"organizations">;
export type User = Tables<"users">;
export type CreditLedger = Tables<"credit_ledger">;
export type AgentConfig = Tables<"agent_configs">;
export type Integration = Tables<"integrations">;
export type TeamInvitation = Tables<"team_invitations">;

// Specific exports - Phase 2 tables
export type Company = CompanyRow;
export type Contact = ContactRow;
export type Activity = ActivityRow;
export type LeadCampaign = LeadCampaignRow;
export type LeadContact = LeadContactRow;
export type OutreachSequence = OutreachSequenceRow;
export type OutreachEmail = OutreachEmailRow;
export type ContentBrief = ContentBriefRow;
export type Article = ArticleRow;
export type Keyword = KeywordRow;
export type Partner = PartnerRow;
export type PartnerOutreach = PartnerOutreachRow;
