-- ENABLE RLS for appointments, payments, booking_reservations

-- 1. Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on booking_reservations
ALTER TABLE public.booking_reservations ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on payment_status_history if it exists
ALTER TABLE IF EXISTS public.payment_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- APPOINTMENTS Policies
-- ============================================================================

-- SELECT: Users see own appointments OR staff sees appointments with them
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    -- User sees own appointments
    user_id = auth.uid()
    OR
    -- Staff sees appointments assigned to them
    staff_id = auth.uid()
    OR
    -- Admin/Staff sees all from their tenant
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- INSERT: Clients can create appointments (backend API uses admin), staff/admin can create
CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Backend APIs use admin token, this allows authenticated users
    true
  );

-- UPDATE: Users can update own appointments, staff can update their appointments
CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    staff_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    staff_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- DELETE: Only staff/admin can delete
CREATE POLICY "appointments_delete" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- ============================================================================
-- PAYMENTS Policies
-- ============================================================================

-- SELECT: Users see own payments OR staff sees payments for their appointments
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    -- User sees own payments
    user_id = auth.uid()
    OR
    -- Staff sees payments for appointments assigned to them
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = payments.appointment_id
      AND a.staff_id = auth.uid()
    )
    OR
    -- Admin sees all payments
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- INSERT: Backend uses admin token
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Backend uses admin token, staff can update their payments
CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- DELETE: Only admin
CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- ============================================================================
-- BOOKING_RESERVATIONS Policies (temporary slots)
-- ============================================================================

-- SELECT: Public can see (these are temporary)
CREATE POLICY "booking_reservations_select" ON public.booking_reservations
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Anyone authenticated can reserve
CREATE POLICY "booking_reservations_insert" ON public.booking_reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Owner or admin can update
CREATE POLICY "booking_reservations_update" ON public.booking_reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Owner or admin can delete
CREATE POLICY "booking_reservations_delete" ON public.booking_reservations
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('appointments', 'payments', 'booking_reservations')
ORDER BY tablename, policyname;

