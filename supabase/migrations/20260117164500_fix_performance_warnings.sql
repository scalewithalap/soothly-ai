-- Fix Supabase Performance Warnings
-- 1. Add missing foreign key indexes
-- 2. Consolidate duplicate permissive policies on webhook_deliveries

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index on api_keys.created_by for FK constraint
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by 
ON public.api_keys (created_by);

-- Index on coupon_redemptions.org_id for FK constraint
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_org_id 
ON public.coupon_redemptions (org_id);

-- Index on discount_coupons.created_by for FK constraint
CREATE INDEX IF NOT EXISTS idx_discount_coupons_created_by 
ON public.discount_coupons (created_by);

-- ============================================================================
-- 2. CONSOLIDATE WEBHOOK_DELIVERIES POLICIES
-- ============================================================================

-- Drop the overlapping permissive policies
DROP POLICY IF EXISTS "Service role can manage deliveries" ON public.webhook_deliveries;
DROP POLICY IF EXISTS "Users can view org webhook deliveries" ON public.webhook_deliveries;

-- Create a single consolidated policy for viewing (authenticated users only see their org's)
CREATE POLICY "webhook_deliveries_select_policy" ON public.webhook_deliveries
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'service_role'
    OR org_id = get_current_user_org_id()
  );

-- Create a single policy for service role to manage all operations
CREATE POLICY "webhook_deliveries_service_role_all" ON public.webhook_deliveries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. ADD INDEX FOR WEBHOOK_DELIVERIES ORG_ID FOR RLS PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org_id 
ON public.webhook_deliveries (org_id);
