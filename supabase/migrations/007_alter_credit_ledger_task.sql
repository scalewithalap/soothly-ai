-- ============================================================================
-- Migration: 007_alter_credit_ledger_task
-- Description: Links credit_ledger entries to specific agent tasks for transparency
-- ============================================================================

ALTER TABLE credit_ledger 
ADD COLUMN IF NOT EXISTS agent_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL;

-- Index for efficient lookups by task
CREATE INDEX IF NOT EXISTS idx_credit_ledger_task ON credit_ledger(agent_task_id);

-- Add comment for documentation
COMMENT ON COLUMN credit_ledger.agent_task_id IS 'Links this credit transaction to a specific agent task for audit trail';
