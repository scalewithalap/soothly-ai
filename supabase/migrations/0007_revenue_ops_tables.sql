-- =============================================================================
-- Migration 0007 — Revenue ops: payment_recoveries table
-- =============================================================================
-- Phase 4c audit (2026-06-10): Revenue Recovery reads/writes
-- payment_recoveries throughout (create-recovery, retry flow, card-updated
-- flow) but the table never existed. Columns derived from all call sites in
-- inngest/functions/revenue_recovery.ts.
-- Apply after 0001-0006. Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,                                -- customer's user row when known
  invoice_id text NOT NULL,
  stripe_customer_id text,
  amount numeric,
  currency text DEFAULT 'USD',
  failure_code text,
  strategy text,                               -- retry_immediately|retry_delayed|update_card|escalate
  status text NOT NULL DEFAULT 'pending',      -- pending|recovered|failed|escalated
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  notified_at timestamptz,
  next_retry_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_recoveries_org_idx
  ON public.payment_recoveries (org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_recoveries_invoice_idx
  ON public.payment_recoveries (invoice_id);

ALTER TABLE public.payment_recoveries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_recoveries' AND policyname='payment_recoveries_org_members') THEN
    CREATE POLICY payment_recoveries_org_members ON public.payment_recoveries
      USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
