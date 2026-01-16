-- ============================================================================
-- Migration: 005_create_storage_bucket
-- Description: Creates 'uploads' bucket for multimodal file inputs
-- Note: Bucket creation should be done via Supabase Dashboard or CLI
-- This migration sets up the RLS policies for the storage
-- ============================================================================

-- RLS Policy for storage.objects (uploads bucket)
-- Users can only access files in their org's folder

CREATE POLICY "Users can read their org's uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'uploads' AND
    (storage.foldername(name))[1] = (SELECT org_id::text FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can upload to their org's folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'uploads' AND
    (storage.foldername(name))[1] = (SELECT org_id::text FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete their org's uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'uploads' AND
    (storage.foldername(name))[1] = (SELECT org_id::text FROM users WHERE id = auth.uid())
  );

-- NOTE: Create the bucket via Supabase Dashboard:
-- Bucket ID: uploads
-- Public: false
-- File size limit: 52428800 (50MB)
-- Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf, 
--   text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
