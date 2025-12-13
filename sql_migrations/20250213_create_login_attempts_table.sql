-- Create login_attempts table for security auditing and rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS login_attempts_user_id_idx ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS login_attempts_ip_address_idx ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS login_attempts_attempted_at_idx ON public.login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS login_attempts_success_idx ON public.login_attempts(success);

-- Create a view to check for suspicious login attempts
CREATE OR REPLACE VIEW suspicious_login_attempts AS
SELECT 
  email,
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(attempted_at) as last_attempt,
  NOW() as checked_at
FROM public.login_attempts
WHERE 
  success = false 
  AND attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY email, ip_address
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert login attempts
CREATE POLICY "service_role_insert_login_attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS anyway

-- Create policy for admins to view login attempts
CREATE POLICY "admin_view_login_attempts"
ON public.login_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'staff')
    AND users.is_active = true
  )
);

-- Retention policy: Delete login attempts older than 90 days
CREATE OR REPLACE FUNCTION delete_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comment on table and columns for documentation
COMMENT ON TABLE public.login_attempts IS 'Tracks all login attempts for security auditing and brute force detection';
COMMENT ON COLUMN public.login_attempts.email IS 'Email address of login attempt';
COMMENT ON COLUMN public.login_attempts.user_id IS 'User ID if login was successful';
COMMENT ON COLUMN public.login_attempts.ip_address IS 'IP address from which login was attempted';
COMMENT ON COLUMN public.login_attempts.success IS 'Whether the login was successful';
COMMENT ON COLUMN public.login_attempts.error_message IS 'Error message if login failed';
COMMENT ON COLUMN public.login_attempts.attempted_at IS 'Timestamp of login attempt';

