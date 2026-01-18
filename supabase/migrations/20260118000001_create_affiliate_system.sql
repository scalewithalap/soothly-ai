-- Affiliate Marketing System Tables
-- Migration: create_affiliate_system_tables
-- Created: 2026-01-18

-- Main affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  payment_method TEXT CHECK (payment_method IN ('paypal', 'bank_transfer', 'stripe')),
  payment_details JSONB DEFAULT '{}',
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_paid DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  landing_page TEXT,
  status TEXT DEFAULT 'clicked' CHECK (status IN ('clicked', 'signed_up', 'converted')),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission ledger
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES affiliate_referrals(id) ON DELETE SET NULL,
  order_id TEXT,
  order_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout requests
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_org ON affiliates(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON affiliate_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);

-- Enable Row Level Security
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates
CREATE POLICY "Users can view own affiliate record" ON affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own affiliate application" ON affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own affiliate record" ON affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for affiliate_referrals (affiliates can view their own referrals)
CREATE POLICY "Affiliates can view own referrals" ON affiliate_referrals
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- RLS Policies for affiliate_commissions
CREATE POLICY "Affiliates can view own commissions" ON affiliate_commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- RLS Policies for affiliate_payouts
CREATE POLICY "Affiliates can view own payouts" ON affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Affiliates can request payouts" ON affiliate_payouts
  FOR INSERT WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );
