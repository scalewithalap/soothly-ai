-- =============================================================================
-- Migration 0004 — pgvector enablement + vector search RPCs
-- =============================================================================
-- Audit findings (2026-06-10): the code calls 6 vector/observability RPCs that
-- schema.sql never defined, and all embedding columns are typed `text`:
--   * search_knowledge_base      (lib/ai/knowledge-base/KnowledgeBase.ts)
--   * get_knowledge_base_stats   (KnowledgeBase.getStats)
--   * match_semantic_cache       (lib/agents/memory/SemanticCache.ts)
--   * search_agent_memories      (lib/agents/memory/AgentMemory.ts)
--   * access_agent_memory        (AgentMemory.access)
--   * get_trace_tree             (lib/agents/memory observability / traces UI)
--
-- Embedding standard (ADR-006): Gemini text-embedding-004, 768 dimensions,
-- via lib/ai/embeddings.ts. All vector columns are vector(768).
--
-- Apply AFTER 0001-0003. Idempotent. Existing `text` embeddings (if any) are
-- cleared rather than converted — pre-launch data only; documents re-embed on
-- next write (is_embedded flag reset).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 1. Re-type embedding columns text → vector(768)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- knowledge_base_embeddings.embedding
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='knowledge_base_embeddings'
                AND column_name='embedding' AND data_type='text') THEN
    ALTER TABLE public.knowledge_base_embeddings
      ALTER COLUMN embedding TYPE vector(768) USING NULL;
    UPDATE public.knowledge_base_documents SET is_embedded = false;
  END IF;

  -- agent_memories.embedding
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='agent_memories'
                AND column_name='embedding' AND data_type='text') THEN
    ALTER TABLE public.agent_memories
      ALTER COLUMN embedding TYPE vector(768) USING NULL;
  END IF;

  -- semantic_cache.query_embedding
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='semantic_cache'
                AND column_name='query_embedding' AND data_type='text') THEN
    ALTER TABLE public.semantic_cache
      ALTER COLUMN query_embedding TYPE vector(768) USING NULL;
  END IF;
END $$;

-- ANN indexes (HNSW; cosine). Safe on empty/small tables, pays off at scale.
CREATE INDEX IF NOT EXISTS kb_embeddings_embedding_idx
  ON public.knowledge_base_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS agent_memories_embedding_idx
  ON public.agent_memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS semantic_cache_embedding_idx
  ON public.semantic_cache USING hnsw (query_embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- 2. search_knowledge_base — RAG retrieval over org documents
--    Caller: KnowledgeBase.search(query, {limit, threshold})
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
  p_org_id uuid,
  p_query_embedding vector(768),
  p_match_threshold double precision DEFAULT 0.7,
  p_match_count integer DEFAULT 5
) RETURNS TABLE (
  document_id uuid,
  title text,
  content text,
  source_type text,
  source_agent text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.id,
         d.title,
         d.content,
         d.source_type,
         d.source_agent,
         d.metadata,
         1 - (e.embedding <=> p_query_embedding) AS similarity
    FROM knowledge_base_embeddings e
    JOIN knowledge_base_documents d ON d.id = e.document_id
   WHERE e.org_id = p_org_id
     AND e.embedding IS NOT NULL
     AND 1 - (e.embedding <=> p_query_embedding) >= p_match_threshold
   ORDER BY e.embedding <=> p_query_embedding
   LIMIT LEAST(p_match_count, 50);
$$;

-- ---------------------------------------------------------------------------
-- 3. get_knowledge_base_stats — dashboard counts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_knowledge_base_stats(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalDocuments',    (SELECT count(*) FROM knowledge_base_documents WHERE org_id = p_org_id),
    'embeddedDocuments', (SELECT count(*) FROM knowledge_base_documents WHERE org_id = p_org_id AND is_embedded),
    'totalEmbeddings',   (SELECT count(*) FROM knowledge_base_embeddings WHERE org_id = p_org_id),
    'bySource',          COALESCE((
      SELECT jsonb_object_agg(source_type, cnt)
        FROM (SELECT source_type, count(*) AS cnt
                FROM knowledge_base_documents
               WHERE org_id = p_org_id GROUP BY source_type) s
    ), '{}'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. match_semantic_cache — cached-response lookup (Customer Success)
--    Caller: SemanticCache.get(query); threshold stored 0-1 as float here.
--    Only returns non-expired entries.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_semantic_cache(
  p_org_id uuid,
  query_embedding vector(768),
  match_threshold double precision DEFAULT 0.95,
  match_count integer DEFAULT 1
) RETURNS TABLE (
  id uuid,
  response jsonb,
  similarity double precision,
  tokens_used integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id,
         c.response,
         1 - (c.query_embedding <=> query_embedding) AS similarity,
         c.tokens_used
    FROM semantic_cache c
   WHERE c.org_id = p_org_id
     AND c.query_embedding IS NOT NULL
     AND (c.expires_at IS NULL OR c.expires_at > now())
     AND 1 - (c.query_embedding <=> query_embedding) >= match_threshold
   ORDER BY c.query_embedding <=> query_embedding
   LIMIT LEAST(match_count, 10);
$$;

-- ---------------------------------------------------------------------------
-- 5. search_agent_memories — long-term memory recall
--    Caller: AgentMemory.recall(). importance stored as integer 0-100;
--    callers pass 0-1 floats — normalize inside the function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_agent_memories(
  p_org_id uuid,
  p_agent_type text,
  p_query_embedding vector(768),
  p_memory_types text[] DEFAULT NULL,
  p_min_importance double precision DEFAULT 0,
  p_match_threshold double precision DEFAULT 0.7,
  p_limit integer DEFAULT 10
) RETURNS TABLE (
  id uuid,
  memory_type text,
  content text,
  metadata jsonb,
  importance integer,
  created_at timestamptz,
  similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id,
         m.memory_type,
         m.content,
         m.metadata,
         m.importance,
         m.created_at,
         1 - (m.embedding <=> p_query_embedding) AS similarity
    FROM agent_memories m
   WHERE m.org_id = p_org_id
     AND m.agent_type = p_agent_type
     AND m.embedding IS NOT NULL
     AND (m.expires_at IS NULL OR m.expires_at > now())
     AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
     AND COALESCE(m.importance, 0) >=
         CASE WHEN p_min_importance <= 1 THEN p_min_importance * 100
              ELSE p_min_importance END
     AND 1 - (m.embedding <=> p_query_embedding) >= p_match_threshold
   ORDER BY m.embedding <=> p_query_embedding
   LIMIT LEAST(p_limit, 50);
$$;

-- ---------------------------------------------------------------------------
-- 6. access_agent_memory — touch on recall (access_count + recency)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.access_agent_memory(p_memory_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE agent_memories
     SET access_count = COALESCE(access_count, 0) + 1,
         accessed_at  = now(),
         importance   = LEAST(100, COALESCE(importance, 50) + 1)
   WHERE id = p_memory_id;
$$;

-- ---------------------------------------------------------------------------
-- 7. get_trace_tree — ordered spans for one trace (observability UI)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trace_tree(p_trace_id uuid)
RETURNS SETOF public.agent_traces
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM agent_traces
   WHERE trace_id = p_trace_id
   ORDER BY started_at ASC;
$$;

-- ---------------------------------------------------------------------------
-- 8. Grants — service_role for writes/agent paths; authenticated may read
--    search results through their own API routes (which enforce org scoping).
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.search_knowledge_base(uuid, vector, double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_knowledge_base_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_semantic_cache(uuid, vector, double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_agent_memories(uuid, text, vector, text[], double precision, double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.access_agent_memory(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_trace_tree(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_knowledge_base(uuid, vector, double precision, integer) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_knowledge_base_stats(uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.match_semantic_cache(uuid, vector, double precision, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_agent_memories(uuid, text, vector, text[], double precision, double precision, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.access_agent_memory(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_trace_tree(uuid) TO service_role, authenticated;
