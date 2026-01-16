-- ============================================================================
-- Migration: 006_create_org_assets
-- Description: Creates org_assets table for unified asset library
-- ============================================================================

CREATE TABLE org_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'upload', 'report', 'export', 'generated', 'scraped'
  )),
  mime_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT NOT NULL,
  source_agent TEXT,
  source_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES agent_messages(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT org_assets_valid_source_agent CHECK (source_agent IS NULL OR source_agent IN (
    'leads', 'content', 'partners', 'contracts', 
    'compliance', 'receivables', 'spend', 'pricing'
  ))
);

-- Performance indexes
CREATE INDEX idx_org_assets_org ON org_assets(org_id);
CREATE INDEX idx_org_assets_type ON org_assets(org_id, asset_type);
CREATE INDEX idx_org_assets_agent ON org_assets(org_id, source_agent);
CREATE INDEX idx_org_assets_tags ON org_assets USING GIN(tags);
CREATE INDEX idx_org_assets_created ON org_assets(created_at DESC);

-- Enable RLS
ALTER TABLE org_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org's assets"
  ON org_assets FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert assets for their org"
  ON org_assets FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's assets"
  ON org_assets FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's assets"
  ON org_assets FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
