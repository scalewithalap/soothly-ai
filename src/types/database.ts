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

// Helper types for easier access
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type Updatable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Specific exports
export type Organization = Tables<"organizations">;
export type User = Tables<"users">;
export type CreditLedger = Tables<"credit_ledger">;
export type AgentConfig = Tables<"agent_configs">;
export type Integration = Tables<"integrations">;
export type TeamInvitation = Tables<"team_invitations">;
