-- Migration: Add tenant_id and description to credit_transactions
-- Date: 2026-03-20
-- Purpose: Support tenant isolation and standardize column naming

-- Add missing columns if not already present
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for tenant_id (important for multi-tenancy queries)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_user ON credit_transactions(tenant_id, user_id);

-- Add comments
COMMENT ON COLUMN credit_transactions.tenant_id IS 'Tenant ID for multi-tenancy isolation';
COMMENT ON COLUMN credit_transactions.description IS 'Detailed description of the transaction';
