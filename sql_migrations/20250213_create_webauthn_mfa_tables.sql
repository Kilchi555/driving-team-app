-- Create webauthn_credentials table to store user's passkeys
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  transports TEXT[], -- ["internal", "usb", "ble", "nfc"]
  device_name TEXT, -- e.g. "iPhone 13 Face ID", "Samsung Galaxy S21"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webauthn_credentials_user_id_idx ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS webauthn_credentials_credential_id_idx ON public.webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS webauthn_credentials_is_active_idx ON public.webauthn_credentials(is_active);

-- Create webauthn_sessions for registration/authentication challenges
CREATE TABLE IF NOT EXISTS public.webauthn_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  challenge BYTEA NOT NULL,
  challenge_type VARCHAR(50) NOT NULL, -- 'registration' or 'authentication'
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS webauthn_sessions_user_id_idx ON public.webauthn_sessions(user_id);
CREATE INDEX IF NOT EXISTS webauthn_sessions_expires_at_idx ON public.webauthn_sessions(expires_at);
CREATE INDEX IF NOT EXISTS webauthn_sessions_is_used_idx ON public.webauthn_sessions(is_used);

-- Create mfa_codes table for email/SMS backup codes
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_backup_codes_user_id_idx ON public.mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS mfa_backup_codes_code_idx ON public.mfa_backup_codes(code);

-- Create mfa_verifications table to track MFA attempts
CREATE TABLE IF NOT EXISTS public.mfa_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'webauthn', 'email_code', 'backup_code'
  ip_address VARCHAR(45),
  device_name TEXT,
  success BOOLEAN NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_verifications_user_id_idx ON public.mfa_verifications(user_id);
CREATE INDEX IF NOT EXISTS mfa_verifications_verified_at_idx ON public.mfa_verifications(verified_at);

-- Add mfa_enabled column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_setup_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_mfa_verification_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webauthn_credentials
CREATE POLICY "users_can_view_own_credentials"
ON public.webauthn_credentials
FOR SELECT
USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "users_can_insert_own_credentials"
ON public.webauthn_credentials
FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "users_can_delete_own_credentials"
ON public.webauthn_credentials
FOR DELETE
USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- RLS Policies for webauthn_sessions
CREATE POLICY "users_can_manage_own_sessions"
ON public.webauthn_sessions
FOR ALL
USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id) OR user_id IS NULL);

-- RLS Policies for mfa_backup_codes
CREATE POLICY "users_can_view_own_backup_codes"
ON public.mfa_backup_codes
FOR SELECT
USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- Allow service role to create backup codes during registration
CREATE POLICY "service_role_manage_backup_codes"
ON public.mfa_backup_codes
FOR ALL
WITH CHECK (true);

-- RLS Policies for mfa_verifications
CREATE POLICY "users_can_view_own_verifications"
ON public.mfa_verifications
FOR SELECT
USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "service_role_log_verifications"
ON public.mfa_verifications
FOR INSERT
WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.webauthn_credentials IS 'Stores WebAuthn/FIDO2 credentials (Passkeys) for passwordless authentication';
COMMENT ON TABLE public.webauthn_sessions IS 'Temporary session data for WebAuthn registration and authentication challenges';
COMMENT ON TABLE public.mfa_backup_codes IS 'One-time backup codes for MFA recovery';
COMMENT ON TABLE public.mfa_verifications IS 'Audit log of MFA verification attempts';

