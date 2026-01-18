-- Semantic Memory Cache
-- LangGraph-inspired checkpoint persistence using pgvector
-- Applied via Supabase MCP: 2026-01-18

-- Enable vector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic cache table for LLM response caching
CREATE TABLE IF NOT EXISTS semantic_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  response JSONB NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tokens_saved INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 0,
  similarity_threshold DECIMAL(3,2) DEFAULT 0.95,
  ttl TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory checkpoints for agent state persistence
CREATE TABLE IF NOT EXISTS memory_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  checkpoint_name TEXT NOT NULL,
  state JSONB NOT NULL,
  metadata JSONB,
  parent_checkpoint_id UUID REFERENCES memory_checkpoints(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for semantic cache
CREATE INDEX IF NOT EXISTS idx_semantic_cache_org ON semantic_cache(org_id);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_hash ON semantic_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_ttl ON semantic_cache(ttl);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding ON semantic_cache 
  USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes for memory checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_org ON memory_checkpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON memory_checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_agent ON memory_checkpoints(org_id, agent_type);

-- RLS Policies for semantic_cache
ALTER TABLE semantic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org semantic_cache"
  ON semantic_cache FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org semantic_cache"
  ON semantic_cache FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own org semantic_cache"
  ON semantic_cache FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org semantic_cache"
  ON semantic_cache FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- RLS Policies for memory_checkpoints
ALTER TABLE memory_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org checkpoints"
  ON memory_checkpoints FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org checkpoints"
  ON memory_checkpoints FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org checkpoints"
  ON memory_checkpoints FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_semantic_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER semantic_cache_updated_at
  BEFORE UPDATE ON semantic_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_semantic_cache_updated_at();

-- RPC function for semantic cache similarity search
CREATE OR REPLACE FUNCTION match_semantic_cache(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_org_id uuid
)
RETURNS TABLE (
  id uuid,
  query_text text,
  response jsonb,
  tokens_used int,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    sc.id,
    sc.query_text,
    sc.response,
    sc.tokens_used,
    1 - (sc.query_embedding <=> query_embedding) as similarity
  FROM semantic_cache sc
  WHERE sc.org_id = p_org_id
    AND sc.ttl > NOW()
    AND sc.query_embedding IS NOT NULL
    AND 1 - (sc.query_embedding <=> query_embedding) > match_threshold
  ORDER BY sc.query_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Cleanup expired cache entries function
CREATE OR REPLACE FUNCTION cleanup_expired_semantic_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM semantic_cache WHERE ttl < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE semantic_cache IS 'Semantic cache for LLM responses using vector similarity';
COMMENT ON TABLE memory_checkpoints IS 'Agent state checkpoints for persistence and recovery';
