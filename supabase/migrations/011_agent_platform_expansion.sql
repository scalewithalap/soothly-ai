-- =====================================================
-- Migration: 011_agent_platform_expansion
-- Purpose: Add comprehensive agent platform features
-- Features: Memory persistence, Workflows, HITL Approvals, 
--           Observability Traces, Guardrails
-- =====================================================

-- =====================================================
-- PART 1: AGENT MEMORY PERSISTENCE
-- Extends existing knowledge base with typed memories
-- =====================================================

-- Agent memories table for episodic, semantic, and procedural memory
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  
  -- Memory classification
  memory_type text NOT NULL CHECK (memory_type IN ('episodic', 'semantic', 'procedural')),
  
  -- Content
  content text NOT NULL,
  content_hash text NOT NULL,
  
  -- Vector embedding (reuse 1536 dimensions for OpenAI compatibility)
  embedding extensions.vector(1536),
  embedding_model text DEFAULT 'text-embedding-3-small',
  
  -- Memory metadata
  importance float DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  access_count int DEFAULT 0,
  decay_rate float DEFAULT 0.01 CHECK (decay_rate >= 0 AND decay_rate <= 1),
  
  -- Context
  source_task_id uuid,
  source_action text,
  related_entity_type text,
  related_entity_id uuid,
  
  -- Rich metadata
  metadata jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  accessed_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  
  -- Constraints
  UNIQUE(org_id, agent_type, content_hash)
);

-- HNSW index for fast similarity search on memories
CREATE INDEX IF NOT EXISTS agent_memories_embedding_idx 
  ON public.agent_memories 
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Standard indexes
CREATE INDEX IF NOT EXISTS agent_memories_org_agent_idx 
  ON public.agent_memories(org_id, agent_type);
CREATE INDEX IF NOT EXISTS agent_memories_type_idx 
  ON public.agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS agent_memories_importance_idx 
  ON public.agent_memories(importance DESC);
CREATE INDEX IF NOT EXISTS agent_memories_tags_idx 
  ON public.agent_memories USING gin(tags);

-- =====================================================
-- PART 2: WORKFLOW ORCHESTRATION
-- Visual DAG-based multi-agent pipelines
-- =====================================================

-- Workflow definitions
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  name text NOT NULL,
  description text,
  
  -- Workflow structure (JSON graph)
  nodes jsonb NOT NULL DEFAULT '[]',
  edges jsonb NOT NULL DEFAULT '[]',
  
  -- Trigger configuration
  trigger_type text NOT NULL DEFAULT 'manual' 
    CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'event')),
  trigger_config jsonb DEFAULT '{}',
  
  -- Execution settings
  max_retries int DEFAULT 3,
  timeout_seconds int DEFAULT 3600,
  parallel_limit int DEFAULT 5,
  
  -- Status
  status text NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  version int DEFAULT 1,
  
  -- Metadata
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, name)
);

-- Workflow execution runs
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Execution status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'waiting_approval', 
                      'completed', 'failed', 'cancelled')),
  
  -- State management
  current_node_id text,
  completed_nodes text[] DEFAULT '{}',
  state jsonb DEFAULT '{}',
  
  -- Input/Output
  input jsonb DEFAULT '{}',
  output jsonb,
  
  -- Error tracking
  error_message text,
  error_node_id text,
  retry_count int DEFAULT 0,
  
  -- Execution context
  triggered_by text NOT NULL DEFAULT 'user',
  triggered_by_user_id uuid REFERENCES public.users(id),
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Workflow node executions (for detailed tracking)
CREATE TABLE IF NOT EXISTS public.workflow_node_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  
  -- Execution
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input jsonb,
  output jsonb,
  error_message text,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,
  
  -- Cost tracking
  credits_used int DEFAULT 0,
  tokens_in int DEFAULT 0,
  tokens_out int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_runs_org_status_idx ON public.workflow_runs(org_id, status);
CREATE INDEX IF NOT EXISTS workflow_node_executions_run_idx ON public.workflow_node_executions(run_id);

-- =====================================================
-- PART 3: HUMAN-IN-THE-LOOP APPROVALS
-- Approval gates and intervention points
-- =====================================================

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Source context
  workflow_run_id uuid REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  agent_type text NOT NULL,
  action text NOT NULL,
  
  -- Request details
  title text NOT NULL,
  description text,
  params jsonb DEFAULT '{}',
  preview_data jsonb,
  
  -- Risk assessment
  risk_level text NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors text[] DEFAULT '{}',
  
  -- Approval status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved', 
                      'auto_rejected', 'expired')),
  
  -- Routing
  requested_by uuid REFERENCES public.users(id),
  assigned_to uuid REFERENCES public.users(id),
  approved_by uuid REFERENCES public.users(id),
  
  -- Resolution
  resolution_comment text,
  resolution_at timestamptz,
  
  -- Timing
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  
  -- Auto-approval rules
  auto_approve_after interval,
  auto_approval_policy text
);

CREATE INDEX IF NOT EXISTS approval_requests_org_status_idx 
  ON public.approval_requests(org_id, status);
CREATE INDEX IF NOT EXISTS approval_requests_assigned_idx 
  ON public.approval_requests(assigned_to) WHERE status = 'pending';

-- =====================================================
-- PART 4: AGENT OBSERVABILITY & TRACING
-- Full execution tracing with cost tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agent_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Trace hierarchy
  trace_id uuid NOT NULL,
  span_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_span_id uuid,
  
  -- Agent info
  agent_type text NOT NULL,
  action text NOT NULL,
  
  -- Execution status
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'error', 'cancelled')),
  
  -- Input/Output (truncated for storage)
  input_preview jsonb,
  output_preview jsonb,
  error_message text,
  error_stack text,
  
  -- LLM-specific metrics
  model text,
  tokens_in int,
  tokens_out int,
  cost_usd numeric(10, 6),
  
  -- Timing
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  
  -- Context
  workflow_run_id uuid REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  task_id uuid,
  
  -- Additional attributes
  attributes jsonb DEFAULT '{}'
);

-- Indexes optimized for trace queries
CREATE INDEX IF NOT EXISTS agent_traces_trace_id_idx ON public.agent_traces(trace_id);
CREATE INDEX IF NOT EXISTS agent_traces_org_time_idx 
  ON public.agent_traces(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS agent_traces_agent_type_idx ON public.agent_traces(agent_type);
CREATE INDEX IF NOT EXISTS agent_traces_status_idx ON public.agent_traces(status);

-- =====================================================
-- PART 5: GUARDRAILS & SAFETY CONSTRAINTS
-- Configurable policy enforcement
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guardrail_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Policy info
  name text NOT NULL,
  description text,
  
  -- Scope
  applies_to_agents text[] DEFAULT '{}', -- Empty = all agents
  applies_to_actions text[] DEFAULT '{}', -- Empty = all actions
  
  -- Rules (JSON array of rule objects)
  rules jsonb NOT NULL DEFAULT '[]',
  
  -- Status
  enabled boolean DEFAULT true,
  priority int DEFAULT 100, -- Lower = higher priority
  
  -- Metadata
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS public.guardrail_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.guardrail_policies(id) ON DELETE CASCADE,
  
  -- Context
  agent_type text NOT NULL,
  action text NOT NULL,
  trace_id uuid,
  
  -- Violation details
  rule_type text NOT NULL,
  rule_condition text,
  violated_value text,
  
  -- Action taken
  enforcement_action text NOT NULL, -- 'blocked', 'warned', 'logged'
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guardrail_policies_org_idx 
  ON public.guardrail_policies(org_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS guardrail_violations_org_time_idx 
  ON public.guardrail_violations(org_id, created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_node_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardrail_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardrail_violations ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

-- Agent Memories policies
CREATE POLICY "Users can view their org memories" ON public.agent_memories
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Service role manages memories" ON public.agent_memories
  FOR ALL USING (auth.role() = 'service_role');

-- Workflows policies
CREATE POLICY "Users can view their org workflows" ON public.workflows
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage their org workflows" ON public.workflows
  FOR ALL USING (org_id = get_user_org_id());

-- Workflow runs policies
CREATE POLICY "Users can view their org workflow runs" ON public.workflow_runs
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Service role manages workflow runs" ON public.workflow_runs
  FOR ALL USING (auth.role() = 'service_role');

-- Workflow node executions inherit from runs
CREATE POLICY "Users can view their org node executions" ON public.workflow_node_executions
  FOR SELECT USING (
    run_id IN (SELECT id FROM public.workflow_runs WHERE org_id = get_user_org_id())
  );
CREATE POLICY "Service role manages node executions" ON public.workflow_node_executions
  FOR ALL USING (auth.role() = 'service_role');

-- Approval requests policies
CREATE POLICY "Users can view their org approvals" ON public.approval_requests
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage their org approvals" ON public.approval_requests
  FOR ALL USING (org_id = get_user_org_id());

-- Agent traces policies
CREATE POLICY "Users can view their org traces" ON public.agent_traces
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Service role manages traces" ON public.agent_traces
  FOR ALL USING (auth.role() = 'service_role');

-- Guardrail policies
CREATE POLICY "Users can view their org guardrails" ON public.guardrail_policies
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage their org guardrails" ON public.guardrail_policies
  FOR ALL USING (org_id = get_user_org_id());

-- Guardrail violations policies
CREATE POLICY "Users can view their org violations" ON public.guardrail_violations
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Service role logs violations" ON public.guardrail_violations
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Search agent memories by similarity
CREATE OR REPLACE FUNCTION public.search_agent_memories(
  p_org_id uuid,
  p_agent_type text,
  p_query_embedding extensions.vector(1536),
  p_memory_types text[] DEFAULT NULL,
  p_min_importance float DEFAULT 0,
  p_match_threshold float DEFAULT 0.7,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  memory_type text,
  content text,
  importance float,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.memory_type,
    m.content,
    m.importance,
    m.metadata,
    1 - (m.embedding <=> p_query_embedding) as similarity
  FROM public.agent_memories m
  WHERE m.org_id = p_org_id
    AND m.agent_type = p_agent_type
    AND m.embedding IS NOT NULL
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND m.importance >= p_min_importance
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Update memory access (for importance decay/growth)
CREATE OR REPLACE FUNCTION public.access_agent_memory(p_memory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.agent_memories
  SET 
    accessed_at = now(),
    access_count = access_count + 1,
    -- Increase importance slightly on access (memory consolidation)
    importance = LEAST(1.0, importance + 0.05)
  WHERE id = p_memory_id;
END;
$$;

-- Get trace tree for a trace_id
CREATE OR REPLACE FUNCTION public.get_trace_tree(p_trace_id uuid)
RETURNS TABLE (
  span_id uuid,
  parent_span_id uuid,
  agent_type text,
  action text,
  status text,
  duration_ms int,
  tokens_in int,
  tokens_out int,
  cost_usd numeric,
  depth int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH RECURSIVE trace_tree AS (
    -- Root spans
    SELECT 
      t.span_id, t.parent_span_id, t.agent_type, t.action,
      t.status, t.duration_ms, t.tokens_in, t.tokens_out, t.cost_usd,
      0 as depth
    FROM public.agent_traces t
    WHERE t.trace_id = p_trace_id AND t.parent_span_id IS NULL
    
    UNION ALL
    
    -- Child spans
    SELECT 
      t.span_id, t.parent_span_id, t.agent_type, t.action,
      t.status, t.duration_ms, t.tokens_in, t.tokens_out, t.cost_usd,
      tt.depth + 1
    FROM public.agent_traces t
    JOIN trace_tree tt ON t.parent_span_id = tt.span_id
    WHERE t.trace_id = p_trace_id
  )
  SELECT * FROM trace_tree ORDER BY depth, span_id;
$$;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_timestamp
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_guardrail_policies_timestamp
  BEFORE UPDATE ON public.guardrail_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
