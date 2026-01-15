export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          action: string;
          actor_id: string | null;
          agent_type: string;
          created_at: string | null;
          description: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          metadata: Json | null;
          org_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          agent_type: string;
          created_at?: string | null;
          description?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          agent_type?: string;
          created_at?: string | null;
          description?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      agent_configs: {
        Row: {
          agent_type: string;
          created_at: string | null;
          enabled: boolean | null;
          id: string;
          org_id: string;
          settings: Json | null;
          updated_at: string | null;
        };
        Insert: {
          agent_type: string;
          created_at?: string | null;
          enabled?: boolean | null;
          id?: string;
          org_id: string;
          settings?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          agent_type?: string;
          created_at?: string | null;
          enabled?: boolean | null;
          id?: string;
          org_id?: string;
          settings?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_configs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      articles: {
        Row: {
          ai_completion_tokens: number | null;
          ai_model: string | null;
          ai_prompt_tokens: number | null;
          avg_time_on_page: number | null;
          bounce_rate: number | null;
          brief_id: string | null;
          content: string;
          created_at: string | null;
          excerpt: string | null;
          generation_cost: number | null;
          html_content: string | null;
          id: string;
          keyword_rankings: Json | null;
          meta_description: string | null;
          meta_title: string | null;
          metadata: Json | null;
          org_id: string;
          organic_traffic: number | null;
          page_views: number | null;
          parent_version_id: string | null;
          primary_keyword: string | null;
          published_at: string | null;
          published_url: string | null;
          readability_score: number | null;
          secondary_keywords: string[] | null;
          seo_issues: Json | null;
          seo_score: number | null;
          seo_suggestions: Json | null;
          slug: string | null;
          status: string;
          title: string;
          updated_at: string | null;
          version: number | null;
          word_count: number | null;
        };
        Insert: {
          ai_completion_tokens?: number | null;
          ai_model?: string | null;
          ai_prompt_tokens?: number | null;
          avg_time_on_page?: number | null;
          bounce_rate?: number | null;
          brief_id?: string | null;
          content: string;
          created_at?: string | null;
          excerpt?: string | null;
          generation_cost?: number | null;
          html_content?: string | null;
          id?: string;
          keyword_rankings?: Json | null;
          meta_description?: string | null;
          meta_title?: string | null;
          metadata?: Json | null;
          org_id: string;
          organic_traffic?: number | null;
          page_views?: number | null;
          parent_version_id?: string | null;
          primary_keyword?: string | null;
          published_at?: string | null;
          published_url?: string | null;
          readability_score?: number | null;
          secondary_keywords?: string[] | null;
          seo_issues?: Json | null;
          seo_score?: number | null;
          seo_suggestions?: Json | null;
          slug?: string | null;
          status?: string;
          title: string;
          updated_at?: string | null;
          version?: number | null;
          word_count?: number | null;
        };
        Update: {
          ai_completion_tokens?: number | null;
          ai_model?: string | null;
          ai_prompt_tokens?: number | null;
          avg_time_on_page?: number | null;
          bounce_rate?: number | null;
          brief_id?: string | null;
          content?: string;
          created_at?: string | null;
          excerpt?: string | null;
          generation_cost?: number | null;
          html_content?: string | null;
          id?: string;
          keyword_rankings?: Json | null;
          meta_description?: string | null;
          meta_title?: string | null;
          metadata?: Json | null;
          org_id?: string;
          organic_traffic?: number | null;
          page_views?: number | null;
          parent_version_id?: string | null;
          primary_keyword?: string | null;
          published_at?: string | null;
          published_url?: string | null;
          readability_score?: number | null;
          secondary_keywords?: string[] | null;
          seo_issues?: Json | null;
          seo_score?: number | null;
          seo_suggestions?: Json | null;
          slug?: string | null;
          status?: string;
          title?: string;
          updated_at?: string | null;
          version?: number | null;
          word_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "articles_brief_id_fkey";
            columns: ["brief_id"];
            isOneToOne: false;
            referencedRelation: "content_briefs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_parent_version_id_fkey";
            columns: ["parent_version_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          }
        ];
      };
      companies: {
        Row: {
          created_at: string | null;
          description: string | null;
          domain: string | null;
          employees_count: number | null;
          id: string;
          industry: string | null;
          linkedin_url: string | null;
          location_city: string | null;
          location_country: string | null;
          logo_url: string | null;
          metadata: Json | null;
          name: string;
          org_id: string;
          revenue_range: string | null;
          size: string | null;
          updated_at: string | null;
          website_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          domain?: string | null;
          employees_count?: number | null;
          id?: string;
          industry?: string | null;
          linkedin_url?: string | null;
          location_city?: string | null;
          location_country?: string | null;
          logo_url?: string | null;
          metadata?: Json | null;
          name: string;
          org_id: string;
          revenue_range?: string | null;
          size?: string | null;
          updated_at?: string | null;
          website_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          domain?: string | null;
          employees_count?: number | null;
          id?: string;
          industry?: string | null;
          linkedin_url?: string | null;
          location_city?: string | null;
          location_country?: string | null;
          logo_url?: string | null;
          metadata?: Json | null;
          name?: string;
          org_id?: string;
          revenue_range?: string | null;
          size?: string | null;
          updated_at?: string | null;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      contacts: {
        Row: {
          avatar_url: string | null;
          company_id: string | null;
          created_at: string | null;
          email: string;
          first_name: string | null;
          full_name: string | null;
          id: string;
          job_title: string | null;
          last_contacted_at: string | null;
          last_name: string | null;
          linkedin_url: string | null;
          metadata: Json | null;
          org_id: string;
          phone: string | null;
          score: number | null;
          source: string | null;
          source_details: Json | null;
          status: string | null;
          tags: string[] | null;
          twitter_url: string | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          company_id?: string | null;
          created_at?: string | null;
          email: string;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          job_title?: string | null;
          last_contacted_at?: string | null;
          last_name?: string | null;
          linkedin_url?: string | null;
          metadata?: Json | null;
          org_id: string;
          phone?: string | null;
          score?: number | null;
          source?: string | null;
          source_details?: Json | null;
          status?: string | null;
          tags?: string[] | null;
          twitter_url?: string | null;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          company_id?: string | null;
          created_at?: string | null;
          email?: string;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          job_title?: string | null;
          last_contacted_at?: string | null;
          last_name?: string | null;
          linkedin_url?: string | null;
          metadata?: Json | null;
          org_id?: string;
          phone?: string | null;
          score?: number | null;
          source?: string | null;
          source_details?: Json | null;
          status?: string | null;
          tags?: string[] | null;
          twitter_url?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      content_briefs: {
        Row: {
          assigned_to: string | null;
          buyer_persona: Json | null;
          competitor_urls: string[] | null;
          content_type: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          metadata: Json | null;
          org_id: string;
          outline: Json | null;
          primary_keyword: string | null;
          publish_date: string | null;
          research_notes: string | null;
          secondary_keywords: string[] | null;
          status: string;
          target_audience: string | null;
          target_word_count: number | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          buyer_persona?: Json | null;
          competitor_urls?: string[] | null;
          content_type?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id: string;
          outline?: Json | null;
          primary_keyword?: string | null;
          publish_date?: string | null;
          research_notes?: string | null;
          secondary_keywords?: string[] | null;
          status?: string;
          target_audience?: string | null;
          target_word_count?: number | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          buyer_persona?: Json | null;
          competitor_urls?: string[] | null;
          content_type?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
          outline?: Json | null;
          primary_keyword?: string | null;
          publish_date?: string | null;
          research_notes?: string | null;
          secondary_keywords?: string[] | null;
          status?: string;
          target_audience?: string | null;
          target_word_count?: number | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_briefs_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_briefs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      credit_ledger: {
        Row: {
          action: string;
          agent_type: string;
          amount: number;
          balance_after: number;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          org_id: string;
          reference_id: string | null;
          reference_type: string | null;
        };
        Insert: {
          action: string;
          agent_type: string;
          amount: number;
          balance_after: number;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id: string;
          reference_id?: string | null;
          reference_type?: string | null;
        };
        Update: {
          action?: string;
          agent_type?: string;
          amount?: number;
          balance_after?: number;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
          reference_id?: string | null;
          reference_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      integrations: {
        Row: {
          created_at: string | null;
          credentials: Json | null;
          error_message: string | null;
          id: string;
          last_used_at: string | null;
          org_id: string;
          provider: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          credentials?: Json | null;
          error_message?: string | null;
          id?: string;
          last_used_at?: string | null;
          org_id: string;
          provider: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          credentials?: Json | null;
          error_message?: string | null;
          id?: string;
          last_used_at?: string | null;
          org_id?: string;
          provider?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      keywords: {
        Row: {
          article_id: string | null;
          best_position: number | null;
          competition_level: string | null;
          cpc: number | null;
          created_at: string | null;
          current_position: number | null;
          id: string;
          is_primary: boolean | null;
          keyword: string;
          keyword_difficulty: number | null;
          last_checked_at: string | null;
          metadata: Json | null;
          org_id: string;
          position_change: number | null;
          previous_position: number | null;
          search_volume: number | null;
          serp_features: string[] | null;
          status: string | null;
          target_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          article_id?: string | null;
          best_position?: number | null;
          competition_level?: string | null;
          cpc?: number | null;
          created_at?: string | null;
          current_position?: number | null;
          id?: string;
          is_primary?: boolean | null;
          keyword: string;
          keyword_difficulty?: number | null;
          last_checked_at?: string | null;
          metadata?: Json | null;
          org_id: string;
          position_change?: number | null;
          previous_position?: number | null;
          search_volume?: number | null;
          serp_features?: string[] | null;
          status?: string | null;
          target_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          article_id?: string | null;
          best_position?: number | null;
          competition_level?: string | null;
          cpc?: number | null;
          created_at?: string | null;
          current_position?: number | null;
          id?: string;
          is_primary?: boolean | null;
          keyword?: string;
          keyword_difficulty?: number | null;
          last_checked_at?: string | null;
          metadata?: Json | null;
          org_id?: string;
          position_change?: number | null;
          previous_position?: number | null;
          search_volume?: number | null;
          serp_features?: string[] | null;
          status?: string | null;
          target_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "keywords_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "keywords_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      lead_campaigns: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          daily_limit: number | null;
          description: string | null;
          enrichment_enabled: boolean | null;
          id: string;
          leads_collected: number | null;
          leads_contacted: number | null;
          leads_qualified: number | null;
          metadata: Json | null;
          name: string;
          org_id: string;
          scoring_model: string | null;
          scraping_sources: string[] | null;
          started_at: string | null;
          status: string;
          target_criteria: Json | null;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          daily_limit?: number | null;
          description?: string | null;
          enrichment_enabled?: boolean | null;
          id?: string;
          leads_collected?: number | null;
          leads_contacted?: number | null;
          leads_qualified?: number | null;
          metadata?: Json | null;
          name: string;
          org_id: string;
          scoring_model?: string | null;
          scraping_sources?: string[] | null;
          started_at?: string | null;
          status?: string;
          target_criteria?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          daily_limit?: number | null;
          description?: string | null;
          enrichment_enabled?: boolean | null;
          id?: string;
          leads_collected?: number | null;
          leads_contacted?: number | null;
          leads_qualified?: number | null;
          metadata?: Json | null;
          name?: string;
          org_id?: string;
          scoring_model?: string | null;
          scraping_sources?: string[] | null;
          started_at?: string | null;
          status?: string;
          target_criteria?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_campaigns_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      lead_contacts: {
        Row: {
          campaign_id: string | null;
          contact_id: string;
          created_at: string | null;
          emails_opened: number | null;
          emails_sent: number | null;
          enriched_at: string | null;
          enrichment_data: Json | null;
          enrichment_source: string | null;
          enrichment_status: string | null;
          id: string;
          last_email_sent_at: string | null;
          last_opened_at: string | null;
          last_replied_at: string | null;
          lead_score: number | null;
          links_clicked: number | null;
          metadata: Json | null;
          notes: string | null;
          org_id: string;
          outreach_sequence_id: string | null;
          outreach_status: string | null;
          qualification_status: string | null;
          score_breakdown: Json | null;
          updated_at: string | null;
        };
        Insert: {
          campaign_id?: string | null;
          contact_id: string;
          created_at?: string | null;
          emails_opened?: number | null;
          emails_sent?: number | null;
          enriched_at?: string | null;
          enrichment_data?: Json | null;
          enrichment_source?: string | null;
          enrichment_status?: string | null;
          id?: string;
          last_email_sent_at?: string | null;
          last_opened_at?: string | null;
          last_replied_at?: string | null;
          lead_score?: number | null;
          links_clicked?: number | null;
          metadata?: Json | null;
          notes?: string | null;
          org_id: string;
          outreach_sequence_id?: string | null;
          outreach_status?: string | null;
          qualification_status?: string | null;
          score_breakdown?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          campaign_id?: string | null;
          contact_id?: string;
          created_at?: string | null;
          emails_opened?: number | null;
          emails_sent?: number | null;
          enriched_at?: string | null;
          enrichment_data?: Json | null;
          enrichment_source?: string | null;
          enrichment_status?: string | null;
          id?: string;
          last_email_sent_at?: string | null;
          last_opened_at?: string | null;
          last_replied_at?: string | null;
          lead_score?: number | null;
          links_clicked?: number | null;
          metadata?: Json | null;
          notes?: string | null;
          org_id?: string;
          outreach_sequence_id?: string | null;
          outreach_status?: string | null;
          qualification_status?: string | null;
          score_breakdown?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_contacts_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "lead_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_contacts_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_contacts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          company_size: string | null;
          created_at: string | null;
          domain: string | null;
          id: string;
          industry: string | null;
          name: string;
          paddle_customer_id: string | null;
          paddle_subscription_id: string | null;
          settings: Json | null;
          subscription_status: string | null;
          subscription_tier: string | null;
          timezone: string | null;
          trial_ends_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          company_size?: string | null;
          created_at?: string | null;
          domain?: string | null;
          id?: string;
          industry?: string | null;
          name: string;
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          settings?: Json | null;
          subscription_status?: string | null;
          subscription_tier?: string | null;
          timezone?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          company_size?: string | null;
          created_at?: string | null;
          domain?: string | null;
          id?: string;
          industry?: string | null;
          name?: string;
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          settings?: Json | null;
          subscription_status?: string | null;
          subscription_tier?: string | null;
          timezone?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      outreach_emails: {
        Row: {
          body: string;
          click_count: number | null;
          clicked_at: string | null;
          created_at: string | null;
          delivered_at: string | null;
          error_message: string | null;
          from_email: string;
          id: string;
          lead_contact_id: string;
          metadata: Json | null;
          open_count: number | null;
          opened_at: string | null;
          org_id: string;
          replied_at: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          sequence_id: string | null;
          status: string;
          step_number: number | null;
          subject: string;
          to_email: string;
        };
        Insert: {
          body: string;
          click_count?: number | null;
          clicked_at?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          error_message?: string | null;
          from_email: string;
          id?: string;
          lead_contact_id: string;
          metadata?: Json | null;
          open_count?: number | null;
          opened_at?: string | null;
          org_id: string;
          replied_at?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sequence_id?: string | null;
          status?: string;
          step_number?: number | null;
          subject: string;
          to_email: string;
        };
        Update: {
          body?: string;
          click_count?: number | null;
          clicked_at?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          error_message?: string | null;
          from_email?: string;
          id?: string;
          lead_contact_id?: string;
          metadata?: Json | null;
          open_count?: number | null;
          opened_at?: string | null;
          org_id?: string;
          replied_at?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sequence_id?: string | null;
          status?: string;
          step_number?: number | null;
          subject?: string;
          to_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outreach_emails_lead_contact_id_fkey";
            columns: ["lead_contact_id"];
            isOneToOne: false;
            referencedRelation: "lead_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outreach_emails_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outreach_emails_sequence_id_fkey";
            columns: ["sequence_id"];
            isOneToOne: false;
            referencedRelation: "outreach_sequences";
            referencedColumns: ["id"];
          }
        ];
      };
      outreach_sequences: {
        Row: {
          conversion_rate: number | null;
          created_at: string | null;
          description: string | null;
          id: string;
          metadata: Json | null;
          name: string;
          org_id: string;
          status: string;
          steps: Json;
          total_completed: number | null;
          total_enrolled: number | null;
          trigger_config: Json | null;
          trigger_type: string | null;
          updated_at: string | null;
        };
        Insert: {
          conversion_rate?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          name: string;
          org_id: string;
          status?: string;
          steps?: Json;
          total_completed?: number | null;
          total_enrolled?: number | null;
          trigger_config?: Json | null;
          trigger_type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          conversion_rate?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          name?: string;
          org_id?: string;
          status?: string;
          steps?: Json;
          total_completed?: number | null;
          total_enrolled?: number | null;
          trigger_config?: Json | null;
          trigger_type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "outreach_sequences_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      partner_outreach: {
        Row: {
          content: string | null;
          created_at: string | null;
          follow_up_date: string | null;
          follow_up_notes: string | null;
          follow_up_required: boolean | null;
          id: string;
          metadata: Json | null;
          opened_at: string | null;
          org_id: string;
          partner_id: string;
          personalization_data: Json | null;
          replied_at: string | null;
          response_content: string | null;
          response_sentiment: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          sent_by: string | null;
          status: string;
          subject: string | null;
          template_id: string | null;
          type: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          follow_up_date?: string | null;
          follow_up_notes?: string | null;
          follow_up_required?: boolean | null;
          id?: string;
          metadata?: Json | null;
          opened_at?: string | null;
          org_id: string;
          partner_id: string;
          personalization_data?: Json | null;
          replied_at?: string | null;
          response_content?: string | null;
          response_sentiment?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_by?: string | null;
          status?: string;
          subject?: string | null;
          template_id?: string | null;
          type: string;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          follow_up_date?: string | null;
          follow_up_notes?: string | null;
          follow_up_required?: boolean | null;
          id?: string;
          metadata?: Json | null;
          opened_at?: string | null;
          org_id?: string;
          partner_id?: string;
          personalization_data?: Json | null;
          replied_at?: string | null;
          response_content?: string | null;
          response_sentiment?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_by?: string | null;
          status?: string;
          subject?: string | null;
          template_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_outreach_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_outreach_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_outreach_sent_by_fkey";
            columns: ["sent_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      partners: {
        Row: {
          api_enabled: boolean | null;
          commission_rate: number | null;
          commission_type: string | null;
          company_id: string | null;
          contact_id: string | null;
          contract_end: string | null;
          contract_start: string | null;
          conversion_rate: number | null;
          created_at: string | null;
          documentation_url: string | null;
          fit_breakdown: Json | null;
          fit_score: number | null;
          id: string;
          integration_type: string | null;
          metadata: Json | null;
          name: string;
          notes: string | null;
          org_id: string;
          primary_contact_email: string | null;
          primary_contact_name: string | null;
          primary_contact_phone: string | null;
          status: string;
          terms: Json | null;
          tier: string | null;
          total_commissions_paid: number | null;
          total_referrals: number | null;
          total_revenue: number | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          api_enabled?: boolean | null;
          commission_rate?: number | null;
          commission_type?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          contract_end?: string | null;
          contract_start?: string | null;
          conversion_rate?: number | null;
          created_at?: string | null;
          documentation_url?: string | null;
          fit_breakdown?: Json | null;
          fit_score?: number | null;
          id?: string;
          integration_type?: string | null;
          metadata?: Json | null;
          name: string;
          notes?: string | null;
          org_id: string;
          primary_contact_email?: string | null;
          primary_contact_name?: string | null;
          primary_contact_phone?: string | null;
          status?: string;
          terms?: Json | null;
          tier?: string | null;
          total_commissions_paid?: number | null;
          total_referrals?: number | null;
          total_revenue?: number | null;
          type?: string;
          updated_at?: string | null;
        };
        Update: {
          api_enabled?: boolean | null;
          commission_rate?: number | null;
          commission_type?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          contract_end?: string | null;
          contract_start?: string | null;
          conversion_rate?: number | null;
          created_at?: string | null;
          documentation_url?: string | null;
          fit_breakdown?: Json | null;
          fit_score?: number | null;
          id?: string;
          integration_type?: string | null;
          metadata?: Json | null;
          name?: string;
          notes?: string | null;
          org_id?: string;
          primary_contact_email?: string | null;
          primary_contact_name?: string | null;
          primary_contact_phone?: string | null;
          status?: string;
          terms?: Json | null;
          tier?: string | null;
          total_commissions_paid?: number | null;
          total_referrals?: number | null;
          total_revenue?: number | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partners_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partners_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      team_invitations: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string | null;
          id: string;
          invited_by: string;
          org_id: string;
          role: string | null;
          status: string | null;
          token: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at?: string | null;
          id?: string;
          invited_by: string;
          org_id: string;
          role?: string | null;
          status?: string | null;
          token?: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string | null;
          id?: string;
          invited_by?: string;
          org_id?: string;
          role?: string | null;
          status?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          last_seen_at: string | null;
          org_id: string | null;
          preferences: Json | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          last_seen_at?: string | null;
          org_id?: string | null;
          preferences?: Json | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          last_seen_at?: string | null;
          org_id?: string | null;
          preferences?: Json | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      organization_credits: {
        Row: {
          org_id: string | null;
          total_added: number | null;
          total_credits: number | null;
          total_used: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      add_credits: {
        Args: {
          p_amount: number;
          p_metadata?: Json;
          p_org_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      deduct_credits: {
        Args: {
          p_action: string;
          p_agent_type: string;
          p_amount: number;
          p_metadata?: Json;
          p_org_id: string;
          p_reference_id?: string;
          p_reference_type?: string;
        };
        Returns: Json;
      };
      get_credit_balance: { Args: { p_org_id: string }; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
