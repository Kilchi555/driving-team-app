-- Migration: Remove sensitive Wallee secret from tenants table
-- 
-- The WALLEE_SECRET_KEY should ONLY come from Vercel environment variables
-- Never store in database for security reasons

BEGIN;

-- 1. Drop the wallee_secret_key column (it was a security risk)
ALTER TABLE public.tenants DROP COLUMN IF EXISTS wallee_secret_key;

-- 2. Clean up any sari credentials from tenants table if they exist
-- (They should now be in tenant_secrets table, encrypted)
ALTER TABLE public.tenants DROP COLUMN IF EXISTS sari_client_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS sari_client_secret;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS sari_username;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS sari_password;

-- 3. Keep these IDs in tenants table (they're public, not sensitive):
-- - wallee_space_id (just an ID)
-- - wallee_user_id (just an ID)
-- - sari_enabled (boolean flag)
-- - sari_environment (string: 'test' or 'production')

COMMIT;
