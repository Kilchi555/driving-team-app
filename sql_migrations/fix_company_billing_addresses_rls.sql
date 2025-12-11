-- Fix RLS policies for 'company_billing_addresses' table
-- Issue: Users cannot insert/update billing addresses with 403 Forbidden error

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "company_billing_addresses_select_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_insert_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_update_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_delete_policy" ON company_billing_addresses;

-- Enable RLS
ALTER TABLE company_billing_addresses ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see their own billing addresses
-- Staff/Admin can see billing addresses for students in their tenant
CREATE POLICY "company_billing_addresses_select_policy" ON company_billing_addresses
FOR SELECT
USING (
  -- User can see their own addresses
  auth.uid() = (
    SELECT auth_user_id FROM users WHERE id = user_id
  )
  OR
  -- Staff/Admin can see addresses for their tenant
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id
    AND u.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  OR
  -- Admin can see all addresses in their tenant
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- INSERT: Users can create their own billing addresses
-- Staff can create billing addresses for students in their tenant
CREATE POLICY "company_billing_addresses_insert_policy" ON company_billing_addresses
FOR INSERT
WITH CHECK (
  -- User is creating for themselves
  auth.uid() = (
    SELECT auth_user_id FROM users WHERE id = user_id
  )
  OR
  -- Staff is creating for a student in their tenant
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id
    AND u.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- UPDATE: Users can update their own billing addresses
-- Staff can update billing addresses for students in their tenant
CREATE POLICY "company_billing_addresses_update_policy" ON company_billing_addresses
FOR UPDATE
USING (
  -- User is updating their own
  auth.uid() = (
    SELECT auth_user_id FROM users WHERE id = user_id
  )
  OR
  -- Staff is updating for a student in their tenant
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id
    AND u.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
)
WITH CHECK (
  -- Same checks for the new data
  auth.uid() = (
    SELECT auth_user_id FROM users WHERE id = user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id
    AND u.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- DELETE: Users can delete their own billing addresses
-- Staff can delete billing addresses for students in their tenant
CREATE POLICY "company_billing_addresses_delete_policy" ON company_billing_addresses
FOR DELETE
USING (
  -- User is deleting their own
  auth.uid() = (
    SELECT auth_user_id FROM users WHERE id = user_id
  )
  OR
  -- Staff is deleting for a student in their tenant
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id
    AND u.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- ✅ WICHTIG: Payments mit null company_billing_address_id
-- Die payments table sollte mit getSupabaseAdmin() erstellt werden (RLS bypass)
-- DAMIT: Payments können trotz fehlender Rechnungsadresse erstellt werden
-- UND: Die Rechnungsadresse kann später vom Staff nachträglich hinzugefügt werden
-- 
-- Workflow:
-- 1. Payment erstellen mit company_billing_address_id = null
-- 2. Zeige "Fehlendes Payment" Pendenz im Modal
-- 3. Staff klickt auf "Adresse hinzufügen"
-- 4. Staff trägt Rechnungsadresse ein
-- 5. Payment wird aktualisiert mit company_billing_address_id
