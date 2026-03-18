-- Allow anon role to INSERT payments for shop checkout (guest purchases)
CREATE POLICY "anon_insert_shop_payment" ON payments
  FOR INSERT TO anon
  WITH CHECK (
    payment_status = 'pending'
    AND payment_method = 'wallee'
    AND tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id AND is_active = true)
  );

-- Allow anon role to INSERT guest users (no auth, client role only)
CREATE POLICY "anon_insert_guest_user" ON users
  FOR INSERT TO anon
  WITH CHECK (
    auth_user_id IS NULL
    AND role = 'client'
    AND is_active = false
    AND tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id AND is_active = true)
  );

-- Allow anon role to SELECT guest users by email+tenant for duplicate check
CREATE POLICY "anon_select_guest_user" ON users
  FOR SELECT TO anon
  USING (
    auth_user_id IS NULL
    AND role = 'client'
    AND is_active = false
  );

-- Allow anon role to UPDATE guest users (fill empty fields only)
CREATE POLICY "anon_update_guest_user" ON users
  FOR UPDATE TO anon
  USING (
    auth_user_id IS NULL
    AND role = 'client'
    AND is_active = false
  )
  WITH CHECK (
    auth_user_id IS NULL
    AND role = 'client'
    AND is_active = false
  );
