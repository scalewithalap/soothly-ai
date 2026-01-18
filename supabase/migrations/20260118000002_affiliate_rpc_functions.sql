-- Affiliate System RPC Functions
-- These functions handle atomic operations for affiliate tracking

-- Increment referral count
CREATE OR REPLACE FUNCTION increment_affiliate_referrals(p_affiliate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE affiliates
  SET 
    total_referrals = total_referrals + 1,
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;

-- Increment conversion count
CREATE OR REPLACE FUNCTION increment_affiliate_conversions(p_affiliate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE affiliates
  SET 
    total_conversions = total_conversions + 1,
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;

-- Update affiliate earnings
CREATE OR REPLACE FUNCTION update_affiliate_earnings(p_affiliate_id UUID, p_amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE affiliates
  SET 
    total_earned = total_earned + p_amount,
    pending_balance = pending_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;

-- Deduct from affiliate balance (for payouts)
CREATE OR REPLACE FUNCTION deduct_affiliate_balance(p_affiliate_id UUID, p_amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE affiliates
  SET 
    pending_balance = pending_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_affiliate_id
  AND pending_balance >= p_amount;
END;
$$;

-- Mark payout as completed
CREATE OR REPLACE FUNCTION complete_affiliate_payout(p_payout_id UUID, p_reference TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate_id UUID;
  v_amount DECIMAL;
BEGIN
  -- Get payout details
  SELECT affiliate_id, amount INTO v_affiliate_id, v_amount
  FROM affiliate_payouts
  WHERE id = p_payout_id AND status = 'processing';

  IF v_affiliate_id IS NULL THEN
    RAISE EXCEPTION 'Payout not found or not in processing state';
  END IF;

  -- Update payout status
  UPDATE affiliate_payouts
  SET 
    status = 'completed',
    payment_reference = p_reference,
    processed_at = NOW()
  WHERE id = p_payout_id;

  -- Update affiliate totals
  UPDATE affiliates
  SET 
    total_paid = total_paid + v_amount,
    updated_at = NOW()
  WHERE id = v_affiliate_id;
END;
$$;
