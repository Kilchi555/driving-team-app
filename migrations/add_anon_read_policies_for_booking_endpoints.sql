-- RLS Policies for public booking endpoints
-- These policies allow anon users to read data needed for booking
-- All queries MUST filter by tenant_id for data isolation

-- 1. Allow anon to read tenants (public tenant data)
CREATE POLICY "anon_read_tenants"
ON public.tenants
FOR SELECT
USING (true); -- Public data, anyone can read

-- 2. Allow anon to read locations (filtered by tenant_id in query)
CREATE POLICY "anon_read_locations"
ON public.locations
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- 3. Allow anon to read staff_locations (filtered by tenant_id in query)
CREATE POLICY "anon_read_staff_locations"
ON public.staff_locations
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- 4. Allow anon to read users (staff members, filtered by tenant_id and role in query)
CREATE POLICY "anon_read_staff_users"
ON public.users
FOR SELECT
USING (true); -- Anon users can read staff, but must filter by tenant_id and role=staff in query

-- 5. Allow anon to read availability_slots (filtered by tenant_id in query)
CREATE POLICY "anon_read_availability_slots"
ON public.availability_slots
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- 6. Allow anon to read appointments (filtered by tenant_id in query)
CREATE POLICY "anon_read_appointments"
ON public.appointments
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- 7. Allow anon to read external_busy_times (filtered by tenant_id in query)
CREATE POLICY "anon_read_external_busy_times"
ON public.external_busy_times
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- 8. Allow anon to read working_hours (filtered by tenant_id in query)
CREATE POLICY "anon_read_working_hours"
ON public.working_hours
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- 9. Allow anon to read tenant_settings (filtered by tenant_id in query)
CREATE POLICY "anon_read_tenant_settings"
ON public.tenant_settings
FOR SELECT
USING (true); -- Anon users can read, but must filter by tenant_id in query

-- Note: The actual data isolation is enforced at the APPLICATION LEVEL
-- All queries in the backend endpoints MUST include .eq('tenant_id', tenant_id)
-- The RLS policies here simply allow anon users to attempt to read these tables
-- The query filters are what actually enforce tenant isolation
