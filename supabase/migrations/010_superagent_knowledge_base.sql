-- =====================================================
-- Migration: 010_superagent_knowledge_base
-- Purpose: Enable pgvector and create knowledge base for Superagent RAG
-- =====================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Create knowledge base documents table
CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Document metadata
  title text NOT NULL,
  source_type text NOT NULL DEFAULT 'manual', -- manual, agent_output, import
  source_agent text, -- Which agent created this (if any)
  source_reference_id uuid, -- Reference to original record
  
  -- Content
  content text NOT NULL,
  content_hash text NOT NULL, -- For deduplication
  
  -- Chunking info
  chunk_index integer DEFAULT 0,
  parent_document_id uuid REFERENCES public.knowledge_base_documents(id) ON DELETE CASCADE,
  
  -- Status
  is_embedded boolean DEFAULT false,
  embedding_model text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, content_hash)
);

-- 3. Create embeddings table with vector column
CREATE TABLE IF NOT EXISTS public.knowledge_base_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_base_documents(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Vector embedding (1536 dimensions for OpenAI ada-002 / text-embedding-3-small)
  embedding extensions.vector(1536) NOT NULL,
  
  -- Model info
  model text NOT NULL DEFAULT 'text-embedding-3-small',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(document_id)
);

-- 4. Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS knowledge_base_embeddings_embedding_idx 
  ON public.knowledge_base_embeddings 
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Create index on org_id for filtering
CREATE INDEX IF NOT EXISTS knowledge_base_embeddings_org_id_idx 
  ON public.knowledge_base_embeddings(org_id);

CREATE INDEX IF NOT EXISTS knowledge_base_documents_org_id_idx 
  ON public.knowledge_base_documents(org_id);

-- 6. Enable RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_embeddings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Users can only access their org's knowledge base
DROP POLICY IF EXISTS "Users can view their org knowledge base" ON public.knowledge_base_documents;
CREATE POLICY "Users can view their org knowledge base"
  ON public.knowledge_base_documents FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert to their org knowledge base" ON public.knowledge_base_documents;
CREATE POLICY "Users can insert to their org knowledge base"
  ON public.knowledge_base_documents FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their org knowledge base" ON public.knowledge_base_documents;
CREATE POLICY "Users can update their org knowledge base"
  ON public.knowledge_base_documents FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete from their org knowledge base" ON public.knowledge_base_documents;
CREATE POLICY "Users can delete from their org knowledge base"
  ON public.knowledge_base_documents FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Embeddings policies (service role only for writes, users can read)
DROP POLICY IF EXISTS "Users can view their org embeddings" ON public.knowledge_base_embeddings;
CREATE POLICY "Users can view their org embeddings"
  ON public.knowledge_base_embeddings FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role can manage embeddings" ON public.knowledge_base_embeddings;
CREATE POLICY "Service role can manage embeddings"
  ON public.knowledge_base_embeddings FOR ALL
  USING (auth.role() = 'service_role');

-- 8. Create function for semantic search
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
  p_org_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_threshold float DEFAULT 0.7,
  p_match_count int DEFAULT 5
)
RETURNS TABLE (
  document_id uuid,
  title text,
  content text,
  source_type text,
  source_agent text,
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
    d.id as document_id,
    d.title,
    d.content,
    d.source_type,
    d.source_agent,
    d.metadata,
    1 - (e.embedding <=> p_query_embedding) as similarity
  FROM public.knowledge_base_embeddings e
  JOIN public.knowledge_base_documents d ON d.id = e.document_id
  WHERE e.org_id = p_org_id
    AND 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- 9. Create function to get embedding stats for an org
CREATE OR REPLACE FUNCTION public.get_knowledge_base_stats(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_documents', (SELECT COUNT(*) FROM knowledge_base_documents WHERE org_id = p_org_id),
    'embedded_documents', (SELECT COUNT(*) FROM knowledge_base_documents WHERE org_id = p_org_id AND is_embedded = true),
    'total_embeddings', (SELECT COUNT(*) FROM knowledge_base_embeddings WHERE org_id = p_org_id),
    'by_source', (
      SELECT jsonb_object_agg(source_type, cnt)
      FROM (
        SELECT source_type, COUNT(*) as cnt 
        FROM knowledge_base_documents 
        WHERE org_id = p_org_id 
        GROUP BY source_type
      ) sub
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 10. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_knowledge_base_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_knowledge_base_documents_timestamp ON public.knowledge_base_documents;
CREATE TRIGGER update_knowledge_base_documents_timestamp
  BEFORE UPDATE ON public.knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_base_timestamp();
