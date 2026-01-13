-- Migration: Fix RLS policies for webauthn_credentials table
-- Description: Add RLS policies to allow users to manage their own WebAuthn credentials

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS "public"."webauthn_credentials" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own WebAuthn credentials" ON "public"."webauthn_credentials";
DROP POLICY IF EXISTS "Users can create WebAuthn credentials" ON "public"."webauthn_credentials";
DROP POLICY IF EXISTS "Users can update their own WebAuthn credentials" ON "public"."webauthn_credentials";
DROP POLICY IF EXISTS "Users can delete their own WebAuthn credentials" ON "public"."webauthn_credentials";
DROP POLICY IF EXISTS "Service role can manage WebAuthn credentials" ON "public"."webauthn_credentials";
DROP POLICY IF EXISTS "Users can manage their own WebAuthn credentials" ON "public"."webauthn_credentials";

-- RLS Policy 1: Users can view their own WebAuthn credentials
CREATE POLICY "Users can view their own WebAuthn credentials"
  ON "public"."webauthn_credentials"
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy 2: Users can create WebAuthn credentials for themselves
CREATE POLICY "Users can create WebAuthn credentials"
  ON "public"."webauthn_credentials"
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy 3: Users can update their own WebAuthn credentials
CREATE POLICY "Users can update their own WebAuthn credentials"
  ON "public"."webauthn_credentials"
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy 4: Users can delete their own WebAuthn credentials
CREATE POLICY "Users can delete their own WebAuthn credentials"
  ON "public"."webauthn_credentials"
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy 5: Service role has full access
CREATE POLICY "Service role can manage WebAuthn credentials"
  ON "public"."webauthn_credentials"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE "public"."webauthn_credentials" IS 'Stores WebAuthn public keys for Face ID / Touch ID authentication';

