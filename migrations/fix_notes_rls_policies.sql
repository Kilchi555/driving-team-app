-- Fix RLS policies for notes table
-- Enable RLS on notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop old incorrect policies
DROP POLICY IF EXISTS notes_delete_staff ON public.notes;
DROP POLICY IF EXISTS notes_insert_staff ON public.notes;
DROP POLICY IF EXISTS notes_select_all ON public.notes;
DROP POLICY IF EXISTS notes_update_staff ON public.notes;

-- 1. CLIENTS: Sehen nur ihre eigenen Notes (via ihre Appointments)
CREATE POLICY notes_select_own_appointment ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = notes.appointment_id
        AND appointments.user_id = (
          SELECT id FROM public.users 
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 2. STAFF: Sieht alle Notes vom eigenen Tenant
CREATE POLICY notes_select_staff_tenant ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND tenant_id = notes.tenant_id
        AND role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
    )
  );

-- 3. INSERT/UPDATE/DELETE: Nur Staff/Admin vom gleichen Tenant
CREATE POLICY notes_modify_staff ON public.notes
  FOR ALL
  TO authenticated
  USING (
    notes.tenant_id = (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
    )
  )
  WITH CHECK (
    notes.tenant_id = (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
    )
  );
