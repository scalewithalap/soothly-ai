export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      a2a_tasks: {
        Row: {
          artifacts: Json
          created_at: string | null
          error_message: string | null
          external_agent_url: string | null
          id: string
          messages: Json
          org_id: string
          result: Json | null
          session_id: string | null
          status: string
          task_spec: Json
          updated_at: string | null
        }
        Insert: {
          artifacts?: Json
          created_at?: string | null
          error_message?: string | null
          external_agent_url?: string | null
          id?: string
          messages?: Json
          org_id: string
          result?: Json | null
          session_id?: string | null
          status?: string
          task_spec?: Json
          updated_at?: string | null
        }
        Update: {
          artifacts?: Json
          created_at?: string | null
          error_message?: string | null
          external_agent_url?: string | null
          id?: string
          messages?: Json
          org_id?: string
          result?: Json | null
          session_id?: string | null
          status?: string
          task_spec?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "a2a_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          action: string
          actor_id: string | null
          agent_type: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          agent_type: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          agent_type?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          order_amount: number
          order_id: string | null
          referral_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          order_amount: number
          order_id?: string | null
          referral_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          order_amount?: number
          order_id?: string | null
          referral_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          id?: string
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          converted_at: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          landing_page: string | null
          referral_code: string
          referred_user_id: string | null
          status: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          converted_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          referral_code: string
          referred_user_id?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          converted_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          referral_code?: string
          referred_user_id?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          approved_at: string | null
          commission_rate: number | null
          created_at: string | null
          id: string
          org_id: string
          payment_details: Json | null
          payment_method: string | null
          pending_balance: number | null
          referral_code: string
          status: string | null
          total_conversions: number | null
          total_earned: number | null
          total_paid: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          org_id: string
          payment_details?: Json | null
          payment_method?: string | null
          pending_balance?: number | null
          referral_code: string
          status?: string | null
          total_conversions?: number | null
          total_earned?: number | null
          total_paid?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          org_id?: string
          payment_details?: Json | null
          payment_method?: string | null
          pending_balance?: number | null
          referral_code?: string
          status?: string | null
          total_conversions?: number | null
          total_earned?: number | null
          total_paid?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_config: {
        Row: {
          agent_type: string
          autonomy_level: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          last_thought: string | null
          org_id: string
          total_tasks_completed: number | null
          total_usage: number | null
          total_value_generated: number | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          autonomy_level?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_thought?: string | null
          org_id: string
          total_tasks_completed?: number | null
          total_usage?: number | null
          total_value_generated?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          autonomy_level?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_thought?: string | null
          org_id?: string
          total_tasks_completed?: number | null
          total_usage?: number | null
          total_value_generated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configs: {
        Row: {
          agent_type: string
          created_at: string | null
          enabled: boolean | null
          id: string
          mcp_server_ids: string[] | null
          org_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          mcp_server_ids?: string[] | null
          org_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          mcp_server_ids?: string[] | null
          org_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          agent_type: string
          content: string
          content_hash: string
          created_at: string | null
          decay_rate: number | null
          embedding: string | null
          embedding_model: string | null
          expires_at: string | null
          id: string
          importance: number | null
          memory_type: string
          metadata: Json | null
          org_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          source_action: string | null
          source_task_id: string | null
          tags: string[] | null
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          agent_type: string
          content: string
          content_hash: string
          created_at?: string | null
          decay_rate?: number | null
          embedding?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          memory_type: string
          metadata?: Json | null
          org_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source_action?: string | null
          source_task_id?: string | null
          tags?: string[] | null
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          agent_type?: string
          content?: string
          content_hash?: string
          created_at?: string | null
          decay_rate?: number | null
          embedding?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          memory_type?: string
          metadata?: Json | null
          org_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source_action?: string | null
          source_task_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          agent_type: string
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          org_id: string
          role: string
          task_id: string | null
          tokens_used: number | null
        }
        Insert: {
          agent_type: string
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          role: string
          task_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          agent_type?: string
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          role?: string
          task_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          action: string
          agent_type: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          org_id: string
          params: Json | null
          priority: string | null
          result: Json | null
          started_at: string | null
          status: string
          usage_consumed: number | null
        }
        Insert: {
          action: string
          agent_type: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          org_id: string
          params?: Json | null
          priority?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          usage_consumed?: number | null
        }
        Update: {
          action?: string
          agent_type?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          org_id?: string
          params?: Json | null
          priority?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          usage_consumed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_thoughts: {
        Row: {
          agent_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          org_id: string
          thought_type: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          org_id: string
          thought_type?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          org_id?: string
          thought_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_thoughts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_traces: {
        Row: {
          action: string
          agent_type: string
          attributes: Json | null
          completed_at: string | null
          cost_usd: number | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          id: string
          input_preview: Json | null
          model: string | null
          org_id: string
          output_preview: Json | null
          parent_span_id: string | null
          span_id: string
          started_at: string
          status: string
          task_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          trace_id: string
          workflow_run_id: string | null
        }
        Insert: {
          action: string
          agent_type: string
          attributes?: Json | null
          completed_at?: string | null
          cost_usd?: number | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          input_preview?: Json | null
          model?: string | null
          org_id: string
          output_preview?: Json | null
          parent_span_id?: string | null
          span_id?: string
          started_at?: string
          status?: string
          task_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          trace_id: string
          workflow_run_id?: string | null
        }
        Update: {
          action?: string
          agent_type?: string
          attributes?: Json | null
          completed_at?: string | null
          cost_usd?: number | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          input_preview?: Json | null
          model?: string | null
          org_id?: string
          output_preview?: Json | null
          parent_span_id?: string | null
          span_id?: string
          started_at?: string
          status?: string
          task_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          trace_id?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_traces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_traces_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage_logs: {
        Row: {
          api_key_id: string
          endpoint: string
          error_code: string | null
          id: string
          ip_address: unknown
          method: string
          org_id: string
          request_timestamp: string | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          endpoint: string
          error_code?: string | null
          id?: string
          ip_address?: unknown
          method: string
          org_id: string
          request_timestamp?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          endpoint?: string
          error_code?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          org_id?: string
          request_timestamp?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_key_usage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          permissions: Json | null
          rate_limit: number | null
          rate_limit_window: number | null
          revoked_at: string | null
          scopes: string[] | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          permissions?: Json | null
          rate_limit?: number | null
          rate_limit_window?: number | null
          revoked_at?: string | null
          scopes?: string[] | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          permissions?: Json | null
          rate_limit?: number | null
          rate_limit_window?: number | null
          revoked_at?: string | null
          scopes?: string[] | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint_group: string
          id: string
          identifier: string
          identifier_type: string
          request_count: number
          updated_at: string | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint_group?: string
          id?: string
          identifier: string
          identifier_type: string
          request_count?: number
          updated_at?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string | null
          endpoint_group?: string
          id?: string
          identifier?: string
          identifier_type?: string
          request_count?: number
          updated_at?: string | null
          window_start?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          action: string
          agent_type: string
          approved_by: string | null
          assigned_to: string | null
          auto_approval_policy: string | null
          auto_approve_after: unknown
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          org_id: string
          params: Json | null
          preview_data: Json | null
          requested_by: string | null
          resolution_at: string | null
          resolution_comment: string | null
          risk_factors: string[] | null
          risk_level: string
          status: string
          title: string
          workflow_run_id: string | null
        }
        Insert: {
          action: string
          agent_type: string
          approved_by?: string | null
          assigned_to?: string | null
          auto_approval_policy?: string | null
          auto_approve_after?: unknown
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          org_id: string
          params?: Json | null
          preview_data?: Json | null
          requested_by?: string | null
          resolution_at?: string | null
          resolution_comment?: string | null
          risk_factors?: string[] | null
          risk_level?: string
          status?: string
          title: string
          workflow_run_id?: string | null
        }
        Update: {
          action?: string
          agent_type?: string
          approved_by?: string | null
          assigned_to?: string | null
          auto_approval_policy?: string | null
          auto_approve_after?: unknown
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string
          params?: Json | null
          preview_data?: Json | null
          requested_by?: string | null
          resolution_at?: string | null
          resolution_comment?: string | null
          risk_factors?: string[] | null
          risk_level?: string
          status?: string
          title?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          ai_completion_tokens: number | null
          ai_model: string | null
          ai_prompt_tokens: number | null
          avg_time_on_page: number | null
          bounce_rate: number | null
          brief_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          generation_cost: number | null
          html_content: string | null
          id: string
          keyword_rankings: Json | null
          meta_description: string | null
          meta_title: string | null
          metadata: Json | null
          org_id: string
          organic_traffic: number | null
          page_views: number | null
          parent_version_id: string | null
          primary_keyword: string | null
          published_at: string | null
          published_url: string | null
          readability_score: number | null
          secondary_keywords: string[] | null
          seo_issues: Json | null
          seo_score: number | null
          seo_suggestions: Json | null
          slug: string | null
          status: string
          title: string
          updated_at: string | null
          version: number | null
          word_count: number | null
        }
        Insert: {
          ai_completion_tokens?: number | null
          ai_model?: string | null
          ai_prompt_tokens?: number | null
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          brief_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          generation_cost?: number | null
          html_content?: string | null
          id?: string
          keyword_rankings?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          metadata?: Json | null
          org_id: string
          organic_traffic?: number | null
          page_views?: number | null
          parent_version_id?: string | null
          primary_keyword?: string | null
          published_at?: string | null
          published_url?: string | null
          readability_score?: number | null
          secondary_keywords?: string[] | null
          seo_issues?: Json | null
          seo_score?: number | null
          seo_suggestions?: Json | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string | null
          version?: number | null
          word_count?: number | null
        }
        Update: {
          ai_completion_tokens?: number | null
          ai_model?: string | null
          ai_prompt_tokens?: number | null
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          brief_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          generation_cost?: number | null
          html_content?: string | null
          id?: string
          keyword_rankings?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          metadata?: Json | null
          org_id?: string
          organic_traffic?: number | null
          page_views?: number | null
          parent_version_id?: string | null
          primary_keyword?: string | null
          published_at?: string | null
          published_url?: string | null
          readability_score?: number | null
          secondary_keywords?: string[] | null
          seo_issues?: Json | null
          seo_score?: number | null
          seo_suggestions?: Json | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          version?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "content_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          org_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          description: string | null
          domain: string | null
          employees_count: number | null
          id: string
          industry: string | null
          linkedin_url: string | null
          location_city: string | null
          location_country: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          org_id: string
          revenue_range: string | null
          size: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domain?: string | null
          employees_count?: number | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          org_id: string
          revenue_range?: string | null
          size?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domain?: string | null
          employees_count?: number | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          org_id?: string
          revenue_range?: string | null
          size?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_contacted_at: string | null
          last_name: string | null
          linkedin_url: string | null
          metadata: Json | null
          org_id: string
          phone: string | null
          pipeline_stage: string | null
          score: number | null
          source: string | null
          source_details: Json | null
          status: string | null
          tags: string[] | null
          twitter_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          metadata?: Json | null
          org_id: string
          phone?: string | null
          pipeline_stage?: string | null
          score?: number | null
          source?: string | null
          source_details?: Json | null
          status?: string | null
          tags?: string[] | null
          twitter_url?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          metadata?: Json | null
          org_id?: string
          phone?: string | null
          pipeline_stage?: string | null
          score?: number | null
          source?: string | null
          source_details?: Json | null
          status?: string | null
          tags?: string[] | null
          twitter_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_briefs: {
        Row: {
          assigned_to: string | null
          buyer_persona: Json | null
          calendar_position: number | null
          competitor_urls: string[] | null
          content_type: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          org_id: string
          outline: Json | null
          primary_keyword: string | null
          publish_date: string | null
          research_notes: string | null
          scheduled_date: string | null
          secondary_keywords: string[] | null
          status: string
          target_audience: string | null
          target_word_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          buyer_persona?: Json | null
          calendar_position?: number | null
          competitor_urls?: string[] | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          outline?: Json | null
          primary_keyword?: string | null
          publish_date?: string | null
          research_notes?: string | null
          scheduled_date?: string | null
          secondary_keywords?: string[] | null
          status?: string
          target_audience?: string | null
          target_word_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          buyer_persona?: Json | null
          calendar_position?: number | null
          competitor_urls?: string[] | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          outline?: Json | null
          primary_keyword?: string | null
          publish_date?: string | null
          research_notes?: string | null
          scheduled_date?: string | null
          secondary_keywords?: string[] | null
          status?: string
          target_audience?: string | null
          target_word_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          applied_to: string
          coupon_id: string
          created_at: string | null
          discount_amount: number
          final_amount: number
          id: string
          org_id: string
          original_amount: number
          user_id: string
        }
        Insert: {
          applied_to: string
          coupon_id: string
          created_at?: string | null
          discount_amount: number
          final_amount: number
          id?: string
          org_id: string
          original_amount: number
          user_id: string
        }
        Update: {
          applied_to?: string
          coupon_id?: string
          created_at?: string | null
          discount_amount?: number
          final_amount?: number
          id?: string
          org_id?: string
          original_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_entity_mappings: {
        Row: {
          crm_entity_id: string
          crm_updated_at: string | null
          entity_type: string
          id: string
          last_synced_at: string | null
          metadata: Json | null
          org_id: string
          provider: string
          zh_entity_id: string
          zh_updated_at: string | null
        }
        Insert: {
          crm_entity_id: string
          crm_updated_at?: string | null
          entity_type: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          org_id: string
          provider: string
          zh_entity_id: string
          zh_updated_at?: string | null
        }
        Update: {
          crm_entity_id?: string
          crm_updated_at?: string | null
          entity_type?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          org_id?: string
          provider?: string
          zh_entity_id?: string
          zh_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_entity_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          applies_to: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          metadata: Json | null
          min_purchase: number | null
          plan_ids: string[] | null
          type: string
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          applies_to?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          metadata?: Json | null
          min_purchase?: number | null
          plan_ids?: string[] | null
          type: string
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          applies_to?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          metadata?: Json | null
          min_purchase?: number | null
          plan_ids?: string[] | null
          type?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_data: Json | null
          contact_email: string
          created_at: string | null
          current_step: number | null
          id: string
          next_send_at: string | null
          org_id: string
          sequence_id: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_data?: Json | null
          contact_email: string
          created_at?: string | null
          current_step?: number | null
          id?: string
          next_send_at?: string | null
          org_id: string
          sequence_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_data?: Json | null
          contact_email?: string
          created_at?: string | null
          current_step?: number | null
          id?: string
          next_send_at?: string | null
          org_id?: string
          sequence_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_events: {
        Row: {
          created_at: string | null
          enrollment_id: string
          event_type: string
          id: string
          metadata: Json | null
          ses_message_id: string | null
          step_id: string | null
        }
        Insert: {
          created_at?: string | null
          enrollment_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          ses_message_id?: string | null
          step_id?: string | null
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          ses_message_id?: string | null
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_events_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          delay_days: number
          delay_hours: number | null
          id: string
          sequence_id: string
          step_order: number
          subject: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          delay_days?: number
          delay_hours?: number | null
          id?: string
          sequence_id: string
          step_order: number
          subject: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          delay_days?: number
          delay_hours?: number | null
          id?: string
          sequence_id?: string
          step_order?: number
          subject?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          from_email: string
          from_name: string
          id: string
          name: string
          org_id: string
          reply_to_email: string | null
          settings: Json | null
          stats: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_email: string
          from_name: string
          id?: string
          name: string
          org_id: string
          reply_to_email?: string | null
          settings?: Json | null
          stats?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_email?: string
          from_name?: string
          id?: string
          name?: string
          org_id?: string
          reply_to_email?: string | null
          settings?: Json | null
          stats?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          allowed_tiers: string[] | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          metadata: Json | null
          name: string
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_tiers?: string[] | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          name: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_tiers?: string[] | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          name?: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guardrail_policies: {
        Row: {
          applies_to_actions: string[] | null
          applies_to_agents: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          org_id: string
          priority: number | null
          rules: Json
          updated_at: string | null
        }
        Insert: {
          applies_to_actions?: string[] | null
          applies_to_agents?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          org_id: string
          priority?: number | null
          rules?: Json
          updated_at?: string | null
        }
        Update: {
          applies_to_actions?: string[] | null
          applies_to_agents?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          org_id?: string
          priority?: number | null
          rules?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardrail_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_violations: {
        Row: {
          action: string
          agent_type: string
          created_at: string | null
          enforcement_action: string
          id: string
          org_id: string
          policy_id: string
          rule_condition: string | null
          rule_type: string
          trace_id: string | null
          violated_value: string | null
        }
        Insert: {
          action: string
          agent_type: string
          created_at?: string | null
          enforcement_action: string
          id?: string
          org_id: string
          policy_id: string
          rule_condition?: string | null
          rule_type: string
          trace_id?: string | null
          violated_value?: string | null
        }
        Update: {
          action?: string
          agent_type?: string
          created_at?: string | null
          enforcement_action?: string
          id?: string
          org_id?: string
          policy_id?: string
          rule_condition?: string | null
          rule_type?: string
          trace_id?: string | null
          violated_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_violations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardrail_violations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "guardrail_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string | null
          credentials: Json | null
          error_message: string | null
          id: string
          last_used_at: string | null
          org_id: string
          provider: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          error_message?: string | null
          id?: string
          last_used_at?: string | null
          org_id: string
          provider: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          error_message?: string | null
          id?: string
          last_used_at?: string | null
          org_id?: string
          provider?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          article_id: string | null
          best_position: number | null
          competition_level: string | null
          cpc: number | null
          created_at: string | null
          current_position: number | null
          id: string
          is_primary: boolean | null
          keyword: string
          keyword_difficulty: number | null
          last_checked_at: string | null
          metadata: Json | null
          org_id: string
          position_change: number | null
          previous_position: number | null
          search_volume: number | null
          serp_features: string[] | null
          status: string | null
          target_url: string | null
          updated_at: string | null
        }
        Insert: {
          article_id?: string | null
          best_position?: number | null
          competition_level?: string | null
          cpc?: number | null
          created_at?: string | null
          current_position?: number | null
          id?: string
          is_primary?: boolean | null
          keyword: string
          keyword_difficulty?: number | null
          last_checked_at?: string | null
          metadata?: Json | null
          org_id: string
          position_change?: number | null
          previous_position?: number | null
          search_volume?: number | null
          serp_features?: string[] | null
          status?: string | null
          target_url?: string | null
          updated_at?: string | null
        }
        Update: {
          article_id?: string | null
          best_position?: number | null
          competition_level?: string | null
          cpc?: number | null
          created_at?: string | null
          current_position?: number | null
          id?: string
          is_primary?: boolean | null
          keyword?: string
          keyword_difficulty?: number | null
          last_checked_at?: string | null
          metadata?: Json | null
          org_id?: string
          position_change?: number | null
          previous_position?: number | null
          search_volume?: number | null
          serp_features?: string[] | null
          status?: string | null
          target_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keywords_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keywords_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_documents: {
        Row: {
          chunk_index: number | null
          content: string
          content_hash: string
          created_at: string | null
          embedding_model: string | null
          id: string
          is_embedded: boolean | null
          metadata: Json | null
          org_id: string
          parent_document_id: string | null
          source_agent: string | null
          source_reference_id: string | null
          source_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          chunk_index?: number | null
          content: string
          content_hash: string
          created_at?: string | null
          embedding_model?: string | null
          id?: string
          is_embedded?: boolean | null
          metadata?: Json | null
          org_id: string
          parent_document_id?: string | null
          source_agent?: string | null
          source_reference_id?: string | null
          source_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number | null
          content?: string
          content_hash?: string
          created_at?: string | null
          embedding_model?: string | null
          id?: string
          is_embedded?: boolean | null
          metadata?: Json | null
          org_id?: string
          parent_document_id?: string | null
          source_agent?: string | null
          source_reference_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_embeddings: {
        Row: {
          created_at: string | null
          document_id: string
          embedding: string
          id: string
          model: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          embedding: string
          id?: string
          model?: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          embedding?: string
          id?: string
          model?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "knowledge_base_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_embeddings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          daily_limit: number | null
          description: string | null
          enrichment_enabled: boolean | null
          id: string
          leads_collected: number | null
          leads_contacted: number | null
          leads_qualified: number | null
          metadata: Json | null
          name: string
          org_id: string
          scoring_model: string | null
          scraping_sources: string[] | null
          started_at: string | null
          status: string
          target_criteria: Json | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          enrichment_enabled?: boolean | null
          id?: string
          leads_collected?: number | null
          leads_contacted?: number | null
          leads_qualified?: number | null
          metadata?: Json | null
          name: string
          org_id: string
          scoring_model?: string | null
          scraping_sources?: string[] | null
          started_at?: string | null
          status?: string
          target_criteria?: Json | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          enrichment_enabled?: boolean | null
          id?: string
          leads_collected?: number | null
          leads_contacted?: number | null
          leads_qualified?: number | null
          metadata?: Json | null
          name?: string
          org_id?: string
          scoring_model?: string | null
          scraping_sources?: string[] | null
          started_at?: string | null
          status?: string
          target_criteria?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          campaign_id: string | null
          contact_id: string
          created_at: string | null
          emails_opened: number | null
          emails_sent: number | null
          enriched_at: string | null
          enrichment_data: Json | null
          enrichment_source: string | null
          enrichment_status: string | null
          id: string
          last_email_sent_at: string | null
          last_opened_at: string | null
          last_replied_at: string | null
          lead_score: number | null
          links_clicked: number | null
          metadata: Json | null
          notes: string | null
          org_id: string
          outreach_sequence_id: string | null
          outreach_status: string | null
          qualification_status: string | null
          score_breakdown: Json | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id: string
          created_at?: string | null
          emails_opened?: number | null
          emails_sent?: number | null
          enriched_at?: string | null
          enrichment_data?: Json | null
          enrichment_source?: string | null
          enrichment_status?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_opened_at?: string | null
          last_replied_at?: string | null
          lead_score?: number | null
          links_clicked?: number | null
          metadata?: Json | null
          notes?: string | null
          org_id: string
          outreach_sequence_id?: string | null
          outreach_status?: string | null
          qualification_status?: string | null
          score_breakdown?: Json | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string
          created_at?: string | null
          emails_opened?: number | null
          emails_sent?: number | null
          enriched_at?: string | null
          enrichment_data?: Json | null
          enrichment_source?: string | null
          enrichment_status?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_opened_at?: string | null
          last_replied_at?: string | null
          lead_score?: number | null
          links_clicked?: number | null
          metadata?: Json | null
          notes?: string | null
          org_id?: string
          outreach_sequence_id?: string | null
          outreach_status?: string | null
          qualification_status?: string | null
          score_breakdown?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          auth_type: string | null
          created_at: string | null
          credentials_encrypted: string | null
          enabled: boolean | null
          health_status: string | null
          id: string
          last_health_check: string | null
          metadata: Json | null
          name: string
          org_id: string
          transport: string
          updated_at: string | null
          url: string
        }
        Insert: {
          auth_type?: string | null
          created_at?: string | null
          credentials_encrypted?: string | null
          enabled?: boolean | null
          health_status?: string | null
          id?: string
          last_health_check?: string | null
          metadata?: Json | null
          name: string
          org_id: string
          transport?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          auth_type?: string | null
          created_at?: string | null
          credentials_encrypted?: string | null
          enabled?: boolean | null
          health_status?: string | null
          id?: string
          last_health_check?: string | null
          metadata?: Json | null
          name?: string
          org_id?: string
          transport?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_servers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_checkpoints: {
        Row: {
          agent_type: string
          checkpoint_name: string
          created_at: string | null
          id: string
          metadata: Json | null
          org_id: string
          parent_checkpoint_id: string | null
          session_id: string
          state: Json
        }
        Insert: {
          agent_type: string
          checkpoint_name: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          parent_checkpoint_id?: string | null
          session_id: string
          state: Json
        }
        Update: {
          agent_type?: string
          checkpoint_name?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          parent_checkpoint_id?: string | null
          session_id?: string
          state?: Json
        }
        Relationships: [
          {
            foreignKeyName: "memory_checkpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_checkpoints_parent_checkpoint_id_fkey"
            columns: ["parent_checkpoint_id"]
            isOneToOne: false
            referencedRelation: "memory_checkpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          discord_enabled: boolean | null
          discord_webhook_url: string | null
          email_enabled: boolean | null
          id: string
          jira_api_token: string | null
          jira_base_url: string | null
          jira_email: string | null
          jira_enabled: boolean | null
          jira_project_key: string | null
          notify_agent_completion: boolean | null
          notify_agent_errors: boolean | null
          notify_security_alerts: boolean | null
          notify_team_invites: boolean | null
          notify_weekly_report: boolean | null
          org_id: string
          push_enabled: boolean | null
          push_subscription: Json | null
          slack_enabled: boolean | null
          slack_webhook_url: string | null
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          id?: string
          jira_api_token?: string | null
          jira_base_url?: string | null
          jira_email?: string | null
          jira_enabled?: boolean | null
          jira_project_key?: string | null
          notify_agent_completion?: boolean | null
          notify_agent_errors?: boolean | null
          notify_security_alerts?: boolean | null
          notify_team_invites?: boolean | null
          notify_weekly_report?: boolean | null
          org_id: string
          push_enabled?: boolean | null
          push_subscription?: Json | null
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          id?: string
          jira_api_token?: string | null
          jira_base_url?: string | null
          jira_email?: string | null
          jira_enabled?: boolean | null
          jira_project_key?: string | null
          notify_agent_completion?: boolean | null
          notify_agent_errors?: boolean | null
          notify_security_alerts?: boolean | null
          notify_team_invites?: boolean | null
          notify_weekly_report?: boolean | null
          org_id?: string
          push_enabled?: boolean | null
          push_subscription?: Json | null
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          org_id: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          org_id: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          org_id?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_connections: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          org_id: string
          provider: string
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          org_id: string
          provider: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          org_id?: string
          provider?: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          org_id: string
          size_bytes: number | null
          source_agent: string | null
          source_message_id: string | null
          source_task_id: string | null
          storage_path: string
          tags: string[] | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          org_id: string
          size_bytes?: number | null
          source_agent?: string | null
          source_message_id?: string | null
          source_task_id?: string | null
          storage_path: string
          tags?: string[] | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          org_id?: string
          size_bytes?: number | null
          source_agent?: string | null
          source_message_id?: string | null
          source_task_id?: string | null
          storage_path?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "org_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_assets_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "agent_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_assets_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      org_usage: {
        Row: {
          created_at: string | null
          current_count: number | null
          feature_key: string
          id: string
          org_id: string
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string | null
          current_count?: number | null
          feature_key: string
          id?: string
          org_id: string
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string | null
          current_count?: number | null
          feature_key?: string
          id?: string
          org_id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_cycle_anchor: string | null
          billing_interval: string | null
          company_size: string | null
          created_at: string | null
          domain: string | null
          id: string
          industry: string | null
          name: string
          polar_customer_id: string | null
          polar_subscription_id: string | null
          settings: Json | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle_anchor?: string | null
          billing_interval?: string | null
          company_size?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          name: string
          polar_customer_id?: string | null
          polar_subscription_id?: string | null
          settings?: Json | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle_anchor?: string | null
          billing_interval?: string | null
          company_size?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          name?: string
          polar_customer_id?: string | null
          polar_subscription_id?: string | null
          settings?: Json | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outreach_emails: {
        Row: {
          body: string
          click_count: number | null
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          from_email: string
          id: string
          lead_contact_id: string
          metadata: Json | null
          open_count: number | null
          opened_at: string | null
          org_id: string
          replied_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          step_number: number | null
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          from_email: string
          id?: string
          lead_contact_id: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          org_id: string
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_number?: number | null
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          from_email?: string
          id?: string
          lead_contact_id?: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          org_id?: string
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_number?: number | null
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_emails_lead_contact_id_fkey"
            columns: ["lead_contact_id"]
            isOneToOne: false
            referencedRelation: "lead_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "outreach_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sequences: {
        Row: {
          conversion_rate: number | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          org_id: string
          status: string
          steps: Json
          total_completed: number | null
          total_enrolled: number | null
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          conversion_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          org_id: string
          status?: string
          steps?: Json
          total_completed?: number | null
          total_enrolled?: number | null
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          conversion_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          org_id?: string
          status?: string
          steps?: Json
          total_completed?: number | null
          total_enrolled?: number | null
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sequences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_outreach: {
        Row: {
          content: string | null
          created_at: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          metadata: Json | null
          opened_at: string | null
          org_id: string
          partner_id: string
          personalization_data: Json | null
          replied_at: string | null
          response_content: string | null
          response_sentiment: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
          template_id: string | null
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          org_id: string
          partner_id: string
          personalization_data?: Json | null
          replied_at?: string | null
          response_content?: string | null
          response_sentiment?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          type: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          org_id?: string
          partner_id?: string
          personalization_data?: Json | null
          replied_at?: string | null
          response_content?: string | null
          response_sentiment?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_outreach_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_outreach_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_outreach_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          api_enabled: boolean | null
          commission_rate: number | null
          commission_type: string | null
          company_id: string | null
          contact_id: string | null
          contract_end: string | null
          contract_start: string | null
          conversion_rate: number | null
          created_at: string | null
          documentation_url: string | null
          fit_breakdown: Json | null
          fit_score: number | null
          id: string
          integration_type: string | null
          metadata: Json | null
          name: string
          notes: string | null
          org_id: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          status: string
          terms: Json | null
          tier: string | null
          total_commissions_paid: number | null
          total_referrals: number | null
          total_revenue: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          api_enabled?: boolean | null
          commission_rate?: number | null
          commission_type?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_end?: string | null
          contract_start?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          documentation_url?: string | null
          fit_breakdown?: Json | null
          fit_score?: number | null
          id?: string
          integration_type?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          org_id: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          status?: string
          terms?: Json | null
          tier?: string | null
          total_commissions_paid?: number | null
          total_referrals?: number | null
          total_revenue?: number | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          api_enabled?: boolean | null
          commission_rate?: number | null
          commission_type?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_end?: string | null
          contract_start?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          documentation_url?: string | null
          fit_breakdown?: Json | null
          fit_score?: number | null
          id?: string
          integration_type?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          org_id?: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          status?: string
          terms?: Json | null
          tier?: string | null
          total_commissions_paid?: number | null
          total_referrals?: number | null
          total_revenue?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_cache: {
        Row: {
          created_at: string | null
          hit_count: number | null
          id: string
          model: string
          org_id: string
          query_embedding: string | null
          query_hash: string
          query_text: string
          response: Json
          similarity_threshold: number | null
          tokens_saved: number | null
          tokens_used: number | null
          ttl: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hit_count?: number | null
          id?: string
          model: string
          org_id: string
          query_embedding?: string | null
          query_hash: string
          query_text: string
          response: Json
          similarity_threshold?: number | null
          tokens_saved?: number | null
          tokens_used?: number | null
          ttl: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hit_count?: number | null
          id?: string
          model?: string
          org_id?: string
          query_embedding?: string | null
          query_hash?: string
          query_text?: string
          response?: Json
          similarity_threshold?: number | null
          tokens_saved?: number | null
          tokens_used?: number | null
          ttl?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          agents_access: Json
          api_access: string | null
          created_at: string | null
          description: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          is_recurring: boolean
          max_seats: number
          name: string
          price_monthly: number
          price_yearly: number | null
          support_type: string
          tier: string
          updated_at: string | null
          usage_monthly: number
          usage_one_time: number | null
        }
        Insert: {
          agents_access?: Json
          api_access?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          max_seats?: number
          name: string
          price_monthly?: number
          price_yearly?: number | null
          support_type?: string
          tier: string
          updated_at?: string | null
          usage_monthly?: number
          usage_one_time?: number | null
        }
        Update: {
          agents_access?: Json
          api_access?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          max_seats?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          support_type?: string
          tier?: string
          updated_at?: string | null
          usage_monthly?: number
          usage_one_time?: number | null
        }
        Relationships: []
      }
      superagent_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          last_request_at: string | null
          org_id: string
          rate_limit_daily: number | null
          requests_today: number | null
          reset_at: string | null
          token_limit_daily: number | null
          tokens_today: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_request_at?: string | null
          org_id: string
          rate_limit_daily?: number | null
          requests_today?: number | null
          reset_at?: string | null
          token_limit_daily?: number | null
          tokens_today?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_request_at?: string | null
          org_id?: string
          rate_limit_daily?: number | null
          requests_today?: number | null
          reset_at?: string | null
          token_limit_daily?: number | null
          tokens_today?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "superagent_rate_limits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_configs: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          org_id: string
          role: string | null
          status: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          org_id: string
          role?: string | null
          status?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          org_id?: string
          role?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_feature_limits: {
        Row: {
          feature_key: string
          monthly_limit: number
          safety_cap: number | null
          tier: string
        }
        Insert: {
          feature_key: string
          monthly_limit: number
          safety_cap?: number | null
          tier: string
        }
        Update: {
          feature_key?: string
          monthly_limit?: number
          safety_cap?: number | null
          tier?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          org_id: string | null
          preferences: Json | null
          role: string | null
          updated_at: string | null
          verification_expires: string | null
          verification_token: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          org_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
          verification_expires?: string | null
          verification_token?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          org_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
          verification_expires?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_connections: {
        Row: {
          created_at: string
          endpoint_path: string
          events_subscribed: string[]
          id: string
          is_active: boolean
          org_id: string
          provider: string
          secret_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endpoint_path: string
          events_subscribed?: string[]
          id?: string
          is_active?: boolean
          org_id: string
          provider: string
          secret_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endpoint_path?: string
          events_subscribed?: string[]
          id?: string
          is_active?: boolean
          org_id?: string
          provider?: string
          secret_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          org_id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          status: string | null
          webhook_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          org_id: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          status?: string | null
          webhook_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          org_id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          status?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          org_id: string
          payload: Json
          provider: string
          received_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          org_id: string
          payload?: Json
          provider: string
          received_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          org_id?: string
          payload?: Json
          provider?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          max_retries: number | null
          name: string
          org_id: string
          secret: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          max_retries?: number | null
          name: string
          org_id: string
          secret: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          max_retries?: number | null
          name?: string
          org_id?: string
          secret?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_auth_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          external_user_id: string
          id: string
          metadata: Json | null
          org_id: string
          session_token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          external_user_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          session_token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          external_user_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_auth_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_configs: {
        Row: {
          agent_id: string
          allowed_origins: string[]
          created_at: string
          hmac_secret: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          position: string
          remote_functions: Json | null
          settings: Json
          theme: Json
          updated_at: string
        }
        Insert: {
          agent_id: string
          allowed_origins?: string[]
          created_at?: string
          hmac_secret: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          position?: string
          remote_functions?: Json | null
          settings?: Json
          theme?: Json
          updated_at?: string
        }
        Update: {
          agent_id?: string
          allowed_origins?: string[]
          created_at?: string
          hmac_secret?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          position?: string
          remote_functions?: Json | null
          settings?: Json
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_sessions: {
        Row: {
          id: string
          last_activity_at: string
          metadata: Json
          started_at: string
          user_email: string | null
          user_id: string | null
          visitor_id: string
          widget_id: string
        }
        Insert: {
          id?: string
          last_activity_at?: string
          metadata?: Json
          started_at?: string
          user_email?: string | null
          user_id?: string | null
          visitor_id: string
          widget_id: string
        }
        Update: {
          id?: string
          last_activity_at?: string
          metadata?: Json
          started_at?: string
          user_email?: string | null
          user_id?: string | null
          visitor_id?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_sessions_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_node_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json | null
          node_id: string
          output: Json | null
          run_id: string
          started_at: string | null
          status: string
          tokens_in: number | null
          tokens_out: number | null
          usage_consumed: number | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          node_id: string
          output?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          usage_consumed?: number | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          node_id?: string
          output?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          usage_consumed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_node_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          completed_nodes: string[] | null
          created_at: string | null
          current_node_id: string | null
          error_message: string | null
          error_node_id: string | null
          id: string
          input: Json | null
          org_id: string
          output: Json | null
          retry_count: number | null
          started_at: string | null
          state: Json | null
          status: string
          triggered_by: string
          triggered_by_user_id: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_nodes?: string[] | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          error_node_id?: string | null
          id?: string
          input?: Json | null
          org_id: string
          output?: Json | null
          retry_count?: number | null
          started_at?: string | null
          state?: Json | null
          status?: string
          triggered_by?: string
          triggered_by_user_id?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          completed_nodes?: string[] | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          error_node_id?: string | null
          id?: string
          input?: Json | null
          org_id?: string
          output?: Json | null
          retry_count?: number | null
          started_at?: string | null
          state?: Json | null
          status?: string
          triggered_by?: string
          triggered_by_user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          edges: Json
          id: string
          max_retries: number | null
          name: string
          nodes: Json
          org_id: string
          parallel_limit: number | null
          status: string
          timeout_seconds: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          max_retries?: number | null
          name: string
          nodes?: Json
          org_id: string
          parallel_limit?: number | null
          status?: string
          timeout_seconds?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          max_retries?: number | null
          name?: string
          nodes?: Json
          org_id?: string
          parallel_limit?: number | null
          status?: string
          timeout_seconds?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      access_agent_memory: { Args: { p_memory_id: string }; Returns: undefined }
      check_and_increment_usage: {
        Args: {
          p_feature_key: string
          p_increment_by?: number
          p_org_id: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint_group?: string
          p_identifier: string
          p_identifier_type: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      check_superagent_rate_limit: {
        Args: { p_org_id: string; p_tokens?: number }
        Returns: Json
      }
      cleanup_expired_semantic_cache: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      complete_affiliate_payout: {
        Args: { p_payout_id: string; p_reference: string }
        Returns: undefined
      }
      deduct_affiliate_balance: {
        Args: { p_affiliate_id: string; p_amount: number }
        Returns: undefined
      }
      get_api_key_usage_stats: {
        Args: { p_days?: number; p_key_id: string }
        Returns: Json
      }
      get_current_user_org_id: { Args: never; Returns: string }
      get_knowledge_base_stats: { Args: { p_org_id: string }; Returns: Json }
      get_org_usage: {
        Args: { p_feature_key?: string; p_org_id: string }
        Returns: Json
      }
      get_trace_tree: {
        Args: { p_trace_id: string }
        Returns: {
          action: string
          agent_type: string
          cost_usd: number
          depth: number
          duration_ms: number
          parent_span_id: string
          span_id: string
          status: string
          tokens_in: number
          tokens_out: number
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      has_superagent_access: { Args: { user_id: string }; Returns: boolean }
      increment_affiliate_conversions: {
        Args: { p_affiliate_id: string }
        Returns: undefined
      }
      increment_affiliate_referrals: {
        Args: { p_affiliate_id: string }
        Returns: undefined
      }
      increment_agent_usage: {
        Args: { p_agent_type: string; p_count?: number; p_org_id: string }
        Returns: Json
      }
      is_yearly_eligible: { Args: { user_id: string }; Returns: boolean }
      match_semantic_cache: {
        Args: {
          match_count: number
          match_threshold: number
          p_org_id: string
          query_embedding: string
        }
        Returns: {
          id: string
          query_text: string
          response: Json
          similarity: number
          tokens_used: number
        }[]
      }
      rotate_api_key: {
        Args: { p_key_id: string; p_new_hash: string; p_new_prefix: string }
        Returns: Json
      }
      search_agent_memories: {
        Args: {
          p_agent_type: string
          p_limit?: number
          p_match_threshold?: number
          p_memory_types?: string[]
          p_min_importance?: number
          p_org_id: string
          p_query_embedding: string
        }
        Returns: {
          content: string
          id: string
          importance: number
          memory_type: string
          metadata: Json
          similarity: number
        }[]
      }
      search_knowledge_base: {
        Args: {
          p_match_count?: number
          p_match_threshold?: number
          p_org_id: string
          p_query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          metadata: Json
          similarity: number
          source_agent: string
          source_type: string
          title: string
        }[]
      }
      update_affiliate_earnings: {
        Args: { p_affiliate_id: string; p_amount: number }
        Returns: undefined
      }
      validate_api_key: { Args: { p_key_hash: string }; Returns: Json }
      validate_coupon: {
        Args: {
          p_amount: number
          p_apply_to: string
          p_code: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
