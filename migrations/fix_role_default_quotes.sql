-- Fix role column: remove quotes from DEFAULT value
-- The role column was storing "'client'" instead of "client"

BEGIN;

-- Update existing rows that have the quoted value
UPDATE public.users SET role = 'client' WHERE role = '''client''';
UPDATE public.users SET role = 'staff' WHERE role = '''staff''';
UPDATE public.users SET role = 'admin' WHERE role = '''admin''';
UPDATE public.users SET role = 'super_admin' WHERE role = '''super_admin''';
UPDATE public.users SET role = 'tenant_admin' WHERE role = '''tenant_admin''';

-- Verify no more quoted values exist
-- SELECT DISTINCT role FROM public.users WHERE role LIKE '''%''';

COMMIT;
