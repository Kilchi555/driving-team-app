-- Create MFA methods table
CREATE TABLE IF NOT EXISTS public.mfa_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'totp', 'webauthn'
  destination VARCHAR(255), -- Phone number for SMS, email for email, null for TOTP/WebAuthn
  secret TEXT, -- Encrypted TOTP secret
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS mfa_methods_user_id_idx ON public.mfa_methods(user_id);
CREATE INDEX IF NOT EXISTS mfa_methods_type_idx ON public.mfa_methods(type);
CREATE INDEX IF NOT EXISTS mfa_methods_verified_idx ON public.mfa_methods(verified);
CREATE INDEX IF NOT EXISTS mfa_methods_is_active_idx ON public.mfa_methods(is_active);

-- Create MFA login codes table (temporary codes used during login)
CREATE TABLE IF NOT EXISTS public.mfa_login_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method_id UUID REFERENCES public.mfa_methods(id) ON DELETE CASCADE,
  code VARCHAR(10),
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS mfa_login_codes_user_id_idx ON public.mfa_login_codes(user_id);
CREATE INDEX IF NOT EXISTS mfa_login_codes_expires_at_idx ON public.mfa_login_codes(expires_at);
CREATE INDEX IF NOT EXISTS mfa_login_codes_created_at_idx ON public.mfa_login_codes(created_at);

-- Create MFA failed attempts tracking
CREATE TABLE IF NOT EXISTS public.mfa_failed_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS mfa_failed_attempts_user_id_idx ON public.mfa_failed_attempts(user_id);
CREATE INDEX IF NOT EXISTS mfa_failed_attempts_created_at_idx ON public.mfa_failed_attempts(created_at);

-- Enable RLS on MFA tables
ALTER TABLE public.mfa_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_failed_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mfa_methods
-- Users can only see their own MFA methods
CREATE POLICY "users_select_own_mfa_methods"
ON public.mfa_methods
FOR SELECT
USING (
  user_id = (SELECT auth_user_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "users_insert_mfa_methods"
ON public.mfa_methods
FOR INSERT
WITH CHECK (
  user_id = (SELECT auth_user_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "users_update_own_mfa_methods"
ON public.mfa_methods
FOR UPDATE
USING (
  user_id = (SELECT auth_user_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "users_delete_own_mfa_methods"
ON public.mfa_methods
FOR DELETE
USING (
  user_id = (SELECT auth_user_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- RLS Policies for mfa_login_codes - only service role should access these
CREATE POLICY "service_role_manage_login_codes"
ON public.mfa_login_codes
FOR ALL
WITH CHECK (true); -- Service role bypasses RLS

-- RLS Policies for mfa_failed_attempts - only service role should access these
CREATE POLICY "service_role_manage_failed_attempts"
ON public.mfa_failed_attempts
FOR ALL
WITH CHECK (true); -- Service role bypasses RLS

-- Create view for MFA setup status
CREATE OR REPLACE VIEW mfa_setup_status AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(m.id) as total_methods,
  COUNT(CASE WHEN m.verified = true THEN 1 END) as verified_methods,
  COUNT(CASE WHEN m.type = 'sms' AND m.verified = true THEN 1 END) as sms_enabled,
  COUNT(CASE WHEN m.type = 'email' AND m.verified = true THEN 1 END) as email_enabled,
  COUNT(CASE WHEN m.type = 'totp' AND m.verified = true THEN 1 END) as totp_enabled,
  COUNT(CASE WHEN m.type = 'webauthn' AND m.verified = true THEN 1 END) as webauthn_enabled
FROM public.users u
LEFT JOIN public.mfa_methods m ON u.id = m.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email;

-- Comment for documentation
COMMENT ON TABLE public.mfa_methods IS 'Stores user MFA methods (SMS, Email, TOTP, WebAuthn)';
COMMENT ON TABLE public.mfa_login_codes IS 'Temporary codes sent to users during login for MFA verification';
COMMENT ON TABLE public.mfa_failed_attempts IS 'Tracks failed MFA verification attempts';
COMMENT ON TABLE public.login_security_rules IS 'Configurable security rules for login (attempt thresholds, lockout duration, etc.)';

-- Create retention policy function
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.mfa_login_codes
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean up failed MFA attempts older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_mfa_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.mfa_failed_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;



