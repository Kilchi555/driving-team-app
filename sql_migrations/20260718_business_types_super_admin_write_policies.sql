-- Business types & presets are currently read-only for everyone (see
-- 20250224_fix_rls_security_issues.sql). The super-admin dashboard
-- (pages/tenant-admin/business-types.vue) writes to these tables directly
-- via the authenticated client, so without a write policy every save
-- silently fails under RLS. This adds super_admin-only write access,
-- mirroring the pattern used elsewhere (e.g. vercel_log_reviews).

CREATE POLICY "business_types_super_admin_write" ON business_types
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin'));

CREATE POLICY "business_type_presets_super_admin_write" ON business_type_presets
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin'));
