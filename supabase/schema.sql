CREATE TABLE public.a2a_tasks (
  artifacts jsonb NOT NULL,
  created_at timestamp with time zone,
  error_message text,
  external_agent_url text,
  id uuid PRIMARY KEY,
  messages jsonb NOT NULL,
  org_id uuid NOT NULL,
  result jsonb,
  session_id uuid,
  status text NOT NULL,
  task_spec jsonb NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.activities (
  action text NOT NULL,
  actor_id uuid,
  agent_type text NOT NULL,
  created_at timestamp with time zone,
  description text,
  entity_id uuid,
  entity_type text,
  id uuid PRIMARY KEY,
  metadata jsonb,
  org_id uuid NOT NULL
);

CREATE TABLE public.affiliate_commissions (
  affiliate_id uuid NOT NULL,
  commission_amount integer NOT NULL,
  commission_rate integer NOT NULL,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  order_amount integer NOT NULL,
  order_id uuid,
  referral_id uuid,
  status text
);

CREATE TABLE public.affiliate_payouts (
  affiliate_id uuid NOT NULL,
  amount integer NOT NULL,
  id uuid PRIMARY KEY,
  notes text,
  payment_method text NOT NULL,
  payment_reference text,
  processed_at timestamp with time zone,
  requested_at timestamp with time zone,
  status text
);

CREATE TABLE public.affiliate_referrals (
  affiliate_id uuid NOT NULL,
  converted_at timestamp with time zone,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  ip_address text NOT NULL,
  landing_page text,
  referral_code text NOT NULL,
  referred_user_id uuid,
  status text,
  user_agent text
);

CREATE TABLE public.affiliates (
  approved_at timestamp with time zone,
  commission_rate integer,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  payment_details jsonb,
  payment_method text,
  pending_balance integer,
  referral_code text NOT NULL,
  status text,
  total_conversions integer,
  total_earned integer,
  total_paid integer,
  total_referrals integer,
  updated_at timestamp with time zone,
  user_id uuid NOT NULL
);

CREATE TABLE public.agent_config (
  agent_type text NOT NULL,
  autonomy_level text,
  config jsonb,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  is_active boolean,
  last_run_at timestamp with time zone,
  last_thought text,
  org_id uuid NOT NULL,
  total_tasks_completed integer,
  total_usage integer,
  total_value_generated integer,
  updated_at timestamp with time zone
);

CREATE TABLE public.agent_configs (
  agent_type text NOT NULL,
  created_at timestamp with time zone,
  enabled boolean,
  id uuid PRIMARY KEY,
  mcp_server_ids text[],
  org_id uuid NOT NULL,
  settings jsonb,
  updated_at timestamp with time zone
);

CREATE TABLE public.agent_memories (
  access_count integer,
  accessed_at timestamp with time zone,
  agent_type text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamp with time zone,
  decay_rate integer,
  embedding text,
  embedding_model text,
  expires_at timestamp with time zone,
  id uuid PRIMARY KEY,
  importance integer,
  memory_type text NOT NULL,
  metadata jsonb,
  org_id uuid NOT NULL,
  related_entity_id uuid,
  related_entity_type text,
  source_action text,
  source_task_id uuid,
  tags text[]
);

CREATE TABLE public.agent_messages (
  agent_type text NOT NULL,
  attachments jsonb,
  content text NOT NULL,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  metadata jsonb,
  org_id uuid NOT NULL,
  role text NOT NULL,
  task_id uuid,
  tokens_used integer
);

CREATE TABLE public.agent_tasks (
  action text NOT NULL,
  agent_type text NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone,
  error_message text,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  params jsonb,
  priority text,
  result jsonb,
  started_at timestamp with time zone,
  status text NOT NULL,
  usage_consumed integer
);

CREATE TABLE public.agent_thoughts (
  agent_type text NOT NULL,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  message text NOT NULL,
  metadata jsonb,
  org_id uuid NOT NULL,
  thought_type text
);

CREATE TABLE public.agent_traces (
  action text NOT NULL,
  agent_type text NOT NULL,
  attributes jsonb,
  completed_at timestamp with time zone,
  cost_usd integer,
  duration_ms integer,
  error_message text,
  error_stack text,
  id uuid PRIMARY KEY,
  input_preview jsonb,
  model text,
  org_id uuid NOT NULL,
  output_preview jsonb,
  parent_span_id uuid,
  span_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL,
  status text NOT NULL,
  task_id uuid,
  tokens_in integer,
  tokens_out integer,
  trace_id uuid NOT NULL,
  workflow_run_id uuid
);

CREATE TABLE public.api_key_usage_logs (
  api_key_id uuid NOT NULL,
  endpoint text NOT NULL,
  error_code text,
  id uuid PRIMARY KEY,
  ip_address text NOT NULL,
  method text NOT NULL,
  org_id uuid NOT NULL,
  request_timestamp text,
  response_time_ms integer,
  status_code integer,
  user_agent text
);

CREATE TABLE public.api_keys (
  created_at timestamp with time zone,
  created_by text,
  description text,
  expires_at timestamp with time zone,
  id uuid PRIMARY KEY,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  last_used_at timestamp with time zone,
  name text NOT NULL,
  org_id uuid NOT NULL,
  permissions jsonb,
  rate_limit integer,
  rate_limit_window integer,
  revoked_at timestamp with time zone,
  scopes text[],
  usage_count integer
);

CREATE TABLE public.api_rate_limits (
  created_at timestamp with time zone,
  endpoint_group text NOT NULL,
  id uuid PRIMARY KEY,
  identifier text NOT NULL,
  identifier_type text NOT NULL,
  request_count integer NOT NULL,
  updated_at timestamp with time zone,
  window_start text NOT NULL
);

CREATE TABLE public.approval_requests (
  action text NOT NULL,
  agent_type text NOT NULL,
  approved_by text,
  assigned_to text,
  auto_approval_policy text,
  auto_approve_after text NOT NULL,
  created_at timestamp with time zone,
  description text,
  expires_at timestamp with time zone,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  params jsonb,
  preview_data jsonb,
  requested_by text,
  resolution_at timestamp with time zone,
  resolution_comment text,
  risk_factors text[],
  risk_level text NOT NULL,
  status text NOT NULL,
  title text NOT NULL,
  workflow_run_id uuid
);

CREATE TABLE public.articles (
  ai_completion_tokens integer,
  ai_model text,
  ai_prompt_tokens integer,
  avg_time_on_page integer,
  bounce_rate integer,
  brief_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone,
  excerpt text,
  generation_cost integer,
  html_content text,
  id uuid PRIMARY KEY,
  keyword_rankings jsonb,
  meta_description text,
  meta_title text,
  metadata jsonb,
  org_id uuid NOT NULL,
  organic_traffic integer,
  page_views integer,
  parent_version_id uuid,
  primary_keyword text,
  published_at timestamp with time zone,
  published_url text,
  readability_score integer,
  secondary_keywords text[],
  seo_issues jsonb,
  seo_score integer,
  seo_suggestions jsonb,
  slug text,
  status text NOT NULL,
  title text NOT NULL,
  updated_at timestamp with time zone,
  version integer,
  word_count integer
);

CREATE TABLE public.audit_log (
  action text NOT NULL,
  created_at timestamp with time zone,
  entity_id uuid,
  entity_type text NOT NULL,
  id uuid PRIMARY KEY,
  ip_address text,
  new_values jsonb,
  old_values jsonb,
  org_id uuid,
  user_agent text,
  user_id uuid
);

CREATE TABLE public.companies (
  created_at timestamp with time zone,
  description text,
  domain text,
  employees_count integer,
  id uuid PRIMARY KEY,
  industry text,
  linkedin_url text,
  location_city text,
  location_country text,
  logo_url text,
  metadata jsonb,
  name text NOT NULL,
  org_id uuid NOT NULL,
  revenue_range text,
  size text,
  updated_at timestamp with time zone,
  website_url text
);

CREATE TABLE public.contacts (
  avatar_url text,
  company_id uuid,
  created_at timestamp with time zone,
  email text NOT NULL,
  first_name text,
  full_name text,
  id uuid PRIMARY KEY,
  job_title text,
  last_contacted_at timestamp with time zone,
  last_name text,
  linkedin_url text,
  metadata jsonb,
  org_id uuid NOT NULL,
  phone text,
  pipeline_stage text,
  score integer,
  source text,
  source_details jsonb,
  status text,
  tags text[],
  twitter_url text,
  type text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.content_briefs (
  assigned_to text,
  buyer_persona jsonb,
  calendar_position integer,
  competitor_urls text[],
  content_type text,
  created_at timestamp with time zone,
  description text,
  due_date text,
  id uuid PRIMARY KEY,
  metadata jsonb,
  org_id uuid NOT NULL,
  outline jsonb,
  primary_keyword text,
  publish_date text,
  research_notes text,
  scheduled_date text,
  secondary_keywords text[],
  status text NOT NULL,
  target_audience text,
  target_word_count integer,
  title text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.coupon_redemptions (
  applied_to text NOT NULL,
  coupon_id uuid NOT NULL,
  created_at timestamp with time zone,
  discount_amount integer NOT NULL,
  final_amount integer NOT NULL,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  original_amount integer NOT NULL,
  user_id uuid NOT NULL
);

CREATE TABLE public.crm_entity_mappings (
  crm_entity_id uuid NOT NULL,
  crm_updated_at timestamp with time zone,
  entity_type text NOT NULL,
  id uuid PRIMARY KEY,
  last_synced_at timestamp with time zone,
  metadata jsonb,
  org_id uuid NOT NULL,
  provider text NOT NULL,
  zh_entity_id uuid NOT NULL,
  zh_updated_at timestamp with time zone
);

CREATE TABLE public.discount_coupons (
  applies_to text[],
  code text NOT NULL,
  created_at timestamp with time zone,
  created_by text,
  current_uses integer,
  description text,
  id uuid PRIMARY KEY,
  is_active boolean,
  max_uses integer,
  max_uses_per_user integer,
  metadata jsonb,
  min_purchase integer,
  plan_ids text[],
  type text NOT NULL,
  valid_from text,
  valid_until text,
  value integer NOT NULL
);

CREATE TABLE public.email_sequence_enrollments (
  completed_at timestamp with time zone,
  contact_data jsonb,
  contact_email text NOT NULL,
  created_at timestamp with time zone,
  current_step integer,
  id uuid PRIMARY KEY,
  next_send_at timestamp with time zone,
  org_id uuid NOT NULL,
  sequence_id uuid NOT NULL,
  started_at timestamp with time zone,
  status text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.email_sequence_events (
  created_at timestamp with time zone,
  enrollment_id uuid NOT NULL,
  event_type text NOT NULL,
  id uuid PRIMARY KEY,
  metadata jsonb,
  ses_message_id uuid,
  step_id uuid
);

CREATE TABLE public.email_sequence_steps (
  body_html text NOT NULL,
  body_text text,
  created_at timestamp with time zone,
  delay_days integer NOT NULL,
  delay_hours integer,
  id uuid PRIMARY KEY,
  sequence_id uuid NOT NULL,
  step_order integer NOT NULL,
  subject text NOT NULL,
  updated_at timestamp with time zone,
  variables text[]
);

CREATE TABLE public.email_sequences (
  created_at timestamp with time zone,
  created_by text,
  description text,
  from_email text NOT NULL,
  from_name text NOT NULL,
  id uuid PRIMARY KEY,
  name text NOT NULL,
  org_id uuid NOT NULL,
  reply_to_email text,
  settings jsonb,
  stats jsonb,
  status text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.feature_flags (
  allowed_tiers text[],
  created_at timestamp with time zone,
  description text,
  enabled boolean,
  id uuid PRIMARY KEY,
  metadata jsonb,
  name text NOT NULL,
  rollout_percentage integer,
  updated_at timestamp with time zone
);

CREATE TABLE public.guardrail_policies (
  applies_to_actions text[],
  applies_to_agents text[],
  created_at timestamp with time zone,
  created_by text,
  description text,
  enabled boolean,
  id uuid PRIMARY KEY,
  name text NOT NULL,
  org_id uuid NOT NULL,
  priority integer,
  rules jsonb NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.guardrail_violations (
  action text NOT NULL,
  agent_type text NOT NULL,
  created_at timestamp with time zone,
  enforcement_action text NOT NULL,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  rule_condition text,
  rule_type text NOT NULL,
  trace_id uuid,
  violated_value text
);

CREATE TABLE public.integrations (
  created_at timestamp with time zone,
  credentials jsonb,
  error_message text,
  id uuid PRIMARY KEY,
  last_used_at timestamp with time zone,
  org_id uuid NOT NULL,
  provider text NOT NULL,
  status text,
  updated_at timestamp with time zone
);

CREATE TABLE public.keywords (
  article_id uuid,
  best_position integer,
  competition_level text,
  cpc integer,
  created_at timestamp with time zone,
  current_position integer,
  id uuid PRIMARY KEY,
  is_primary boolean,
  keyword text NOT NULL,
  keyword_difficulty integer,
  last_checked_at timestamp with time zone,
  metadata jsonb,
  org_id uuid NOT NULL,
  position_change integer,
  previous_position integer,
  search_volume integer,
  serp_features text[],
  status text,
  target_url text,
  updated_at timestamp with time zone
);

CREATE TABLE public.knowledge_base_documents (
  chunk_index integer,
  content text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamp with time zone,
  embedding_model text,
  id uuid PRIMARY KEY,
  is_embedded boolean,
  metadata jsonb,
  org_id uuid NOT NULL,
  parent_document_id uuid,
  source_agent text,
  source_reference_id uuid,
  source_type text NOT NULL,
  title text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.knowledge_base_embeddings (
  created_at timestamp with time zone,
  document_id uuid NOT NULL,
  embedding text NOT NULL,
  id uuid PRIMARY KEY,
  model text NOT NULL,
  org_id uuid NOT NULL
);

CREATE TABLE public.lead_campaigns (
  completed_at timestamp with time zone,
  created_at timestamp with time zone,
  daily_limit integer,
  description text,
  enrichment_enabled boolean,
  id uuid PRIMARY KEY,
  leads_collected integer,
  leads_contacted integer,
  leads_qualified integer,
  metadata jsonb,
  name text NOT NULL,
  org_id uuid NOT NULL,
  scoring_model text,
  scraping_sources text[],
  started_at timestamp with time zone,
  status text NOT NULL,
  target_criteria jsonb,
  updated_at timestamp with time zone
);

CREATE TABLE public.lead_contacts (
  campaign_id uuid,
  contact_id uuid NOT NULL,
  created_at timestamp with time zone,
  emails_opened integer,
  emails_sent integer,
  enriched_at timestamp with time zone,
  enrichment_data jsonb,
  enrichment_source text,
  enrichment_status text,
  id uuid PRIMARY KEY,
  last_email_sent_at timestamp with time zone,
  last_opened_at timestamp with time zone,
  last_replied_at timestamp with time zone,
  lead_score integer,
  links_clicked integer,
  metadata jsonb,
  notes text,
  org_id uuid NOT NULL,
  outreach_sequence_id uuid,
  outreach_status text,
  qualification_status text,
  score_breakdown jsonb,
  updated_at timestamp with time zone
);

CREATE TABLE public.mcp_servers (
  auth_type text,
  created_at timestamp with time zone,
  credentials_encrypted text,
  enabled boolean,
  health_status text,
  id uuid PRIMARY KEY,
  last_health_check text,
  metadata jsonb,
  name text NOT NULL,
  org_id uuid NOT NULL,
  transport text NOT NULL,
  updated_at timestamp with time zone,
  url text NOT NULL
);

CREATE TABLE public.memory_checkpoints (
  agent_type text NOT NULL,
  checkpoint_name text NOT NULL,
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  metadata jsonb,
  org_id uuid NOT NULL,
  parent_checkpoint_id uuid,
  session_id uuid NOT NULL,
  state jsonb NOT NULL
);

CREATE TABLE public.notification_settings (
  created_at timestamp with time zone,
  discord_enabled boolean,
  discord_webhook_url text,
  email_enabled boolean,
  id uuid PRIMARY KEY,
  jira_api_token text,
  jira_base_url text,
  jira_email text,
  jira_enabled boolean,
  jira_project_key text,
  notify_agent_completion boolean,
  notify_agent_errors boolean,
  notify_security_alerts boolean,
  notify_team_invites boolean,
  notify_weekly_report boolean,
  org_id uuid NOT NULL,
  push_enabled boolean,
  push_subscription jsonb,
  slack_enabled boolean,
  slack_webhook_url text,
  telegram_bot_token text,
  telegram_chat_id uuid,
  telegram_enabled boolean,
  updated_at timestamp with time zone,
  user_id uuid NOT NULL
);

CREATE TABLE public.notifications (
  action_url text,
  created_at timestamp with time zone,
  data jsonb,
  id uuid PRIMARY KEY,
  message text,
  org_id uuid NOT NULL,
  read boolean,
  read_at timestamp with time zone,
  title text NOT NULL,
  type text NOT NULL,
  user_id uuid NOT NULL
);

CREATE TABLE public.oauth_connections (
  access_token_encrypted text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  id uuid PRIMARY KEY,
  is_active boolean NOT NULL,
  metadata jsonb NOT NULL,
  org_id uuid NOT NULL,
  provider text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.org_assets (
  asset_type text NOT NULL,
  created_at timestamp with time zone,
  created_by text,
  description text,
  id uuid PRIMARY KEY,
  metadata jsonb,
  mime_type text,
  name text NOT NULL,
  org_id uuid NOT NULL,
  size_bytes integer,
  source_agent text,
  source_message_id uuid,
  source_task_id uuid,
  storage_path text NOT NULL,
  tags text[]
);

CREATE TABLE public.org_usage (
  created_at timestamp with time zone,
  current_count integer,
  feature_key text NOT NULL,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  period_end text NOT NULL,
  period_start text NOT NULL
);

CREATE TABLE public.organizations (
  billing_cycle_anchor text,
  billing_interval text,
  company_size text,
  created_at timestamp with time zone,
  domain text,
  id uuid PRIMARY KEY,
  industry text,
  name text NOT NULL,
  polar_customer_id uuid,
  polar_subscription_id uuid,
  settings jsonb,
  subscription_status text,
  subscription_tier text,
  timezone text,
  trial_ends_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.outreach_emails (
  body text NOT NULL,
  click_count integer,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone,
  delivered_at timestamp with time zone,
  error_message text,
  from_email text NOT NULL,
  id uuid PRIMARY KEY,
  lead_contact_id uuid NOT NULL,
  metadata jsonb,
  open_count integer,
  opened_at timestamp with time zone,
  org_id uuid NOT NULL,
  replied_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  sequence_id uuid,
  status text NOT NULL,
  step_number integer,
  subject text NOT NULL,
  to_email text NOT NULL
);

CREATE TABLE public.outreach_sequences (
  conversion_rate integer,
  created_at timestamp with time zone,
  description text,
  id uuid PRIMARY KEY,
  metadata jsonb,
  name text NOT NULL,
  org_id uuid NOT NULL,
  status text NOT NULL,
  steps jsonb NOT NULL,
  total_completed integer,
  total_enrolled integer,
  trigger_config jsonb,
  trigger_type text,
  updated_at timestamp with time zone
);

CREATE TABLE public.partner_outreach (
  content text,
  created_at timestamp with time zone,
  follow_up_date text,
  follow_up_notes text,
  follow_up_required boolean,
  id uuid PRIMARY KEY,
  metadata jsonb,
  opened_at timestamp with time zone,
  org_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  personalization_data jsonb,
  replied_at timestamp with time zone,
  response_content text,
  response_sentiment text,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  sent_by text,
  status text NOT NULL,
  subject text,
  template_id uuid,
  type text NOT NULL
);

CREATE TABLE public.partners (
  api_enabled boolean,
  commission_rate integer,
  commission_type text,
  company_id uuid,
  contact_id uuid,
  contract_end text,
  contract_start text,
  conversion_rate integer,
  created_at timestamp with time zone,
  documentation_url text,
  fit_breakdown jsonb,
  fit_score integer,
  id uuid PRIMARY KEY,
  integration_type text,
  metadata jsonb,
  name text NOT NULL,
  notes text,
  org_id uuid NOT NULL,
  primary_contact_email text,
  primary_contact_name text,
  primary_contact_phone text,
  status text NOT NULL,
  terms jsonb,
  tier text,
  total_commissions_paid integer,
  total_referrals integer,
  total_revenue integer,
  type text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.password_reset_tokens (
  created_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  id uuid PRIMARY KEY,
  token text NOT NULL,
  used boolean,
  user_id uuid NOT NULL
);

CREATE TABLE public.semantic_cache (
  created_at timestamp with time zone,
  hit_count integer,
  id uuid PRIMARY KEY,
  model text NOT NULL,
  org_id uuid NOT NULL,
  query_embedding text,
  query_hash text NOT NULL,
  query_text text NOT NULL,
  response jsonb NOT NULL,
  similarity_threshold integer,
  tokens_saved integer,
  tokens_used integer,
  ttl text NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.subscription_plans (
  agents_access jsonb NOT NULL,
  api_access text,
  created_at timestamp with time zone,
  description text,
  display_order integer NOT NULL,
  features jsonb NOT NULL,
  id uuid PRIMARY KEY,
  is_active boolean NOT NULL,
  is_recurring boolean NOT NULL,
  max_seats integer NOT NULL,
  name text NOT NULL,
  price_monthly integer NOT NULL,
  price_yearly integer,
  support_type text NOT NULL,
  tier text NOT NULL,
  updated_at timestamp with time zone,
  usage_monthly integer NOT NULL,
  usage_one_time integer
);

CREATE TABLE public.superagent_rate_limits (
  created_at timestamp with time zone,
  id uuid PRIMARY KEY,
  last_request_at timestamp with time zone,
  org_id uuid NOT NULL,
  rate_limit_daily integer,
  requests_today integer,
  reset_at timestamp with time zone,
  token_limit_daily integer,
  tokens_today integer,
  updated_at timestamp with time zone
);

CREATE TABLE public.system_configs (
  category text NOT NULL,
  created_at timestamp with time zone,
  description text,
  id uuid PRIMARY KEY,
  is_active boolean NOT NULL,
  key text NOT NULL,
  updated_at timestamp with time zone,
  value jsonb NOT NULL
);

CREATE TABLE public.team_invitations (
  created_at timestamp with time zone,
  email text NOT NULL,
  expires_at timestamp with time zone,
  id uuid PRIMARY KEY,
  invited_by text NOT NULL,
  org_id uuid NOT NULL,
  role text,
  status text,
  token text NOT NULL
);

CREATE TABLE public.tier_feature_limits (
  feature_key text NOT NULL,
  monthly_limit integer NOT NULL,
  safety_cap integer,
  tier text NOT NULL
);

CREATE TABLE public.users (
  avatar_url text,
  created_at timestamp with time zone,
  email text NOT NULL,
  email_verified boolean,
  full_name text,
  id uuid PRIMARY KEY,
  last_seen_at timestamp with time zone,
  onboarding_completed boolean,
  onboarding_step integer,
  org_id uuid,
  preferences jsonb,
  role text,
  updated_at timestamp with time zone,
  verification_expires text,
  verification_token text
);

CREATE TABLE public.webhook_connections (
  created_at timestamp with time zone NOT NULL,
  endpoint_path text NOT NULL,
  events_subscribed text[] NOT NULL,
  id uuid PRIMARY KEY,
  is_active boolean NOT NULL,
  org_id uuid NOT NULL,
  provider text NOT NULL,
  secret_key text NOT NULL,
  updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.webhook_deliveries (
  attempts integer,
  created_at timestamp with time zone,
  delivered_at timestamp with time zone,
  event_type text NOT NULL,
  id uuid PRIMARY KEY,
  next_retry_at timestamp with time zone,
  org_id uuid NOT NULL,
  payload jsonb NOT NULL,
  response_body text,
  response_status integer,
  response_time_ms integer,
  status text,
  webhook_id uuid NOT NULL
);

CREATE TABLE public.webhook_events (
  created_at timestamp with time zone NOT NULL,
  event_type text NOT NULL,
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  payload jsonb NOT NULL,
  provider text NOT NULL,
  received_at timestamp with time zone NOT NULL
);

CREATE TABLE public.webhooks (
  created_at timestamp with time zone,
  events text[] NOT NULL,
  id uuid PRIMARY KEY,
  is_active boolean,
  max_retries integer,
  name text NOT NULL,
  org_id uuid NOT NULL,
  secret text NOT NULL,
  updated_at timestamp with time zone,
  url text NOT NULL
);

CREATE TABLE public.widget_auth_sessions (
  created_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  external_user_id uuid NOT NULL,
  id uuid PRIMARY KEY,
  metadata jsonb,
  org_id uuid NOT NULL,
  session_token text NOT NULL
);

CREATE TABLE public.widget_configs (
  agent_id uuid NOT NULL,
  allowed_origins text[] NOT NULL,
  created_at timestamp with time zone NOT NULL,
  hmac_secret text NOT NULL,
  id uuid PRIMARY KEY,
  is_active boolean NOT NULL,
  name text NOT NULL,
  org_id uuid NOT NULL,
  position text NOT NULL,
  remote_functions jsonb,
  settings jsonb NOT NULL,
  theme jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.widget_sessions (
  id uuid PRIMARY KEY,
  last_activity_at timestamp with time zone NOT NULL,
  metadata jsonb NOT NULL,
  started_at timestamp with time zone NOT NULL,
  user_email text,
  user_id uuid,
  visitor_id uuid NOT NULL,
  widget_id uuid NOT NULL
);

CREATE TABLE public.workflow_node_executions (
  completed_at timestamp with time zone,
  duration_ms integer,
  error_message text,
  id uuid PRIMARY KEY,
  input jsonb,
  node_id uuid NOT NULL,
  output jsonb,
  run_id uuid NOT NULL,
  started_at timestamp with time zone,
  status text NOT NULL,
  tokens_in integer,
  tokens_out integer,
  usage_consumed integer
);

CREATE TABLE public.workflow_runs (
  completed_at timestamp with time zone,
  completed_nodes text[],
  created_at timestamp with time zone,
  current_node_id uuid,
  error_message text,
  error_node_id uuid,
  id uuid PRIMARY KEY,
  input jsonb,
  org_id uuid NOT NULL,
  output jsonb,
  retry_count integer,
  started_at timestamp with time zone,
  state jsonb,
  status text NOT NULL,
  triggered_by text NOT NULL,
  triggered_by_user_id uuid,
  workflow_id uuid NOT NULL
);

CREATE TABLE public.workflows (
  created_at timestamp with time zone,
  created_by text,
  description text,
  edges jsonb NOT NULL,
  id uuid PRIMARY KEY,
  max_retries integer,
  name text NOT NULL,
  nodes jsonb NOT NULL,
  org_id uuid NOT NULL,
  parallel_limit integer,
  status text NOT NULL,
  timeout_seconds integer,
  trigger_config jsonb,
  trigger_type text NOT NULL,
  updated_at timestamp with time zone,
  version integer
);
