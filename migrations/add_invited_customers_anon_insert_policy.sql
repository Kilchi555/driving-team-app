-- Migration: Allow anonymous users to insert into invited_customers
-- Use case: Guest checkout in public shop — no login required
-- Security: tenant_id must belong to an existing, active tenant
-- Anon users can only INSERT, not SELECT/UPDATE/DELETE their own or others' records

-- Add anon INSERT policy with tenant validation
CREATE POLICY "invited_customers_anon_insert"
  ON invited_customers
  FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants
      WHERE is_active = true
    )
  );
