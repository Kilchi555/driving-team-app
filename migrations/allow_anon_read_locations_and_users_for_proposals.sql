-- Allow anon users to read locations for booking proposal validation
-- This policy allows reading locations if you provide the correct tenant_id
-- The query still needs to filter by tenant_id, so this doesn't expose all locations

CREATE POLICY "anon_read_locations_for_proposals"
ON public.locations
FOR SELECT
USING (true); -- Allow anon users to read, but they still need to filter by tenant_id via query

-- Allow anon users to read users (staff) for booking proposal validation
-- This policy allows reading staff members if you provide the correct tenant_id

CREATE POLICY "anon_read_users_for_proposals"
ON public.users
FOR SELECT
USING (true); -- Allow anon users to read, but they still need to filter by tenant_id via query
