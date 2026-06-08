/**
 * Affiliate System Types
 * Local type definitions for affiliate tables (until DB migration is applied)
 */

export interface Affiliate {
  id: string;
  user_id: string;
  org_id: string;
  referral_code: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  commission_rate: number;
  payment_method?: string;
  payment_details?: Record<string, unknown>;
  total_referrals: number;
  total_conversions: number;
  total_earned: number;
  total_paid: number;
  pending_balance: number;
  created_at: string;
  approved_at?: string;
  updated_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id?: string;
  referral_code: string;
  ip_address?: string;
  user_agent?: string;
  landing_page?: string;
  status: "clicked" | "signed_up" | "converted";
  converted_at?: string;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id?: string;
  order_id?: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  created_at: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_method: string;
  payment_details?: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  processed_at?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

// API response types
export interface AffiliateStats {
  total_referrals: number;
  total_conversions: number;
  total_earned: number;
  pending_balance: number;
  commission_rate: number;
}

