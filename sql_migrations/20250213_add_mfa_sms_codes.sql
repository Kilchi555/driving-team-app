-- SQL Migration: Add mfa_sms_codes table for SMS-based MFA
-- This allows users to receive temporary 6-digit codes via SMS as MFA fallback

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS public.mfa_sms_codes CASCADE;

-- Create mfa_sms_codes table for temporary SMS codes
CREATE TABLE IF NOT EXISTS public.mfa_sms_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL, -- 6-digit code
  phone_number VARCHAR(20) NOT NULL, -- Which phone number was used
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_sms_codes_user_id_idx ON public.mfa_sms_codes(user_id);
CREATE INDEX IF NOT EXISTS mfa_sms_codes_code_idx ON public.mfa_sms_codes(code);
CREATE INDEX IF NOT EXISTS mfa_sms_codes_expires_at_idx ON public.mfa_sms_codes(expires_at);

-- Enable RLS
ALTER TABLE public.mfa_sms_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role to create/manage SMS codes
CREATE POLICY "service_role_manage_sms_codes"
ON public.mfa_sms_codes
FOR ALL
WITH CHECK (true);

-- Users can view their own SMS codes (unused ones)
CREATE POLICY "users_can_view_own_sms_codes"
ON public.mfa_sms_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id 
    AND auth_user_id = auth.uid()
  )
  AND used_at IS NULL
  AND expires_at > NOW()
);

-- Comments
COMMENT ON TABLE public.mfa_sms_codes IS 'Temporary SMS codes for MFA verification (6-digit codes, 10 minute expiry)';
COMMENT ON COLUMN public.mfa_sms_codes.code IS '6-digit code sent via SMS';
COMMENT ON COLUMN public.mfa_sms_codes.phone_number IS 'Phone number where code was sent';
COMMENT ON COLUMN public.mfa_sms_codes.used_at IS 'When the code was used for verification (NULL = unused)';

-- Optional: Create a view to clean up expired codes (for maintenance)
CREATE OR REPLACE VIEW mfa_sms_codes_expired AS
SELECT id, user_id, code, phone_number, expires_at
FROM public.mfa_sms_codes
WHERE expires_at < NOW()
AND used_at IS NULL;

COMMENT ON VIEW mfa_sms_codes_expired IS 'View of expired SMS codes for cleanup jobs';

