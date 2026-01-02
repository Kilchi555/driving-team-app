-- Add MFA enforcement tracking to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mfa_required_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_locked_reason TEXT;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS users_failed_login_attempts_idx ON public.users(failed_login_attempts);
CREATE INDEX IF NOT EXISTS users_mfa_required_until_idx ON public.users(mfa_required_until);
CREATE INDEX IF NOT EXISTS users_account_locked_until_idx ON public.users(account_locked_until);

-- Create login_security_rules table for configuring security policies
CREATE TABLE IF NOT EXISTS public.login_security_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  max_failed_attempts_before_mfa INT DEFAULT 5,
  max_failed_attempts_before_lockout INT DEFAULT 10,
  lockout_duration_minutes INT DEFAULT 30,
  mfa_required_duration_minutes INT DEFAULT 60,
  max_failed_attempts_per_ip_24h INT DEFAULT 20,
  auto_block_ip_after_attempts INT DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for login_security_rules
ALTER TABLE public.login_security_rules ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view/manage security rules
CREATE POLICY "admin_manage_login_security_rules"
ON public.login_security_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'tenant_admin')
    AND users.is_active = true
    AND (users.tenant_id = login_security_rules.tenant_id OR login_security_rules.tenant_id IS NULL)
  )
);

-- Create view for failed login activity
CREATE OR REPLACE VIEW failed_login_activity AS
SELECT 
  u.id as user_id,
  u.email,
  u.failed_login_attempts,
  u.last_failed_login_at,
  u.mfa_required_until,
  u.account_locked_until,
  COUNT(la.id) as total_failed_attempts_24h,
  CASE 
    WHEN u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW() THEN 'locked'
    WHEN u.mfa_required_until IS NOT NULL AND u.mfa_required_until > NOW() THEN 'mfa_required'
    ELSE 'normal'
  END as security_status
FROM public.users u
LEFT JOIN public.login_attempts la 
  ON la.email = u.email 
  AND la.success = false 
  AND la.attempted_at > NOW() - INTERVAL '24 hours'
WHERE u.is_active = true
GROUP BY u.id, u.email, u.failed_login_attempts, u.last_failed_login_at, u.mfa_required_until, u.account_locked_until;

-- Create function to check login security status
CREATE OR REPLACE FUNCTION check_login_security_status(
  p_email VARCHAR,
  p_ip_address VARCHAR,
  p_tenant_id UUID
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  mfa_required BOOLEAN,
  account_locked BOOLEAN,
  remaining_attempts INT
) AS $$
DECLARE
  v_user_id UUID;
  v_failed_attempts INT;
  v_mfa_required_until TIMESTAMPTZ;
  v_account_locked_until TIMESTAMPTZ;
  v_max_failed_before_mfa INT;
  v_max_failed_before_lockout INT;
  v_ip_failed_attempts INT;
  v_max_ip_attempts INT;
BEGIN
  -- Get security rules for tenant
  v_max_failed_before_mfa := COALESCE(
    (SELECT max_failed_attempts_before_mfa FROM public.login_security_rules 
     WHERE tenant_id = p_tenant_id AND is_active = true LIMIT 1),
    5
  );
  
  v_max_failed_before_lockout := COALESCE(
    (SELECT max_failed_attempts_before_lockout FROM public.login_security_rules 
     WHERE tenant_id = p_tenant_id AND is_active = true LIMIT 1),
    10
  );

  v_max_ip_attempts := COALESCE(
    (SELECT auto_block_ip_after_attempts FROM public.login_security_rules 
     WHERE tenant_id = p_tenant_id AND is_active = true LIMIT 1),
    20
  );
  
  -- Get user info
  SELECT id, failed_login_attempts, mfa_required_until, account_locked_until 
  INTO v_user_id, v_failed_attempts, v_mfa_required_until, v_account_locked_until
  FROM public.users
  WHERE email = p_email AND is_active = true
  LIMIT 1;
  
  -- Check account lockout
  IF v_account_locked_until IS NOT NULL AND v_account_locked_until > NOW() THEN
    RETURN QUERY SELECT 
      false,
      'Account ist gesperrt. Bitte versuchen Sie es später erneut.',
      false,
      true,
      0;
    RETURN;
  END IF;
  
  -- Count IP failed attempts in last 24 hours
  SELECT COUNT(*) INTO v_ip_failed_attempts
  FROM public.login_attempts
  WHERE ip_address = p_ip_address AND success = false 
    AND attempted_at > NOW() - INTERVAL '24 hours';
  
  -- Check IP blocking threshold
  IF v_ip_failed_attempts >= v_max_ip_attempts THEN
    RETURN QUERY SELECT 
      false,
      'Zu viele Anmeldeversuche von Ihrer IP. Bitte versuchen Sie es später erneut.',
      false,
      false,
      0;
    RETURN;
  END IF;
  
  -- Check MFA requirement
  IF v_mfa_required_until IS NOT NULL AND v_mfa_required_until > NOW() THEN
    RETURN QUERY SELECT 
      true,
      NULL,
      true,
      false,
      0;
    RETURN;
  END IF;
  
  -- Check failed attempts threshold for MFA
  IF v_failed_attempts >= v_max_failed_before_mfa THEN
    RETURN QUERY SELECT 
      true,
      NULL,
      true,
      false,
      0;
    RETURN;
  END IF;
  
  -- Normal case - login allowed
  RETURN QUERY SELECT 
    true,
    NULL,
    false,
    false,
    v_max_failed_before_lockout - v_failed_attempts;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record failed login
CREATE OR REPLACE FUNCTION record_failed_login(
  p_email VARCHAR,
  p_ip_address VARCHAR,
  p_tenant_id UUID
)
RETURNS TABLE(
  require_mfa BOOLEAN,
  lock_account BOOLEAN,
  should_block_ip BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_failed_attempts INT;
  v_max_failed_before_mfa INT;
  v_max_failed_before_lockout INT;
  v_lockout_duration_minutes INT;
  v_mfa_duration_minutes INT;
  v_ip_failed_attempts INT;
  v_max_ip_attempts INT;
  v_should_block_ip BOOLEAN;
BEGIN
  -- Get security rules
  SELECT max_failed_attempts_before_mfa, max_failed_attempts_before_lockout,
         lockout_duration_minutes, mfa_required_duration_minutes, auto_block_ip_after_attempts
  INTO v_max_failed_before_mfa, v_max_failed_before_lockout, v_lockout_duration_minutes,
       v_mfa_duration_minutes, v_max_ip_attempts
  FROM public.login_security_rules
  WHERE tenant_id = p_tenant_id AND is_active = true
  LIMIT 1;
  
  -- Set defaults if no rules found
  v_max_failed_before_mfa := COALESCE(v_max_failed_before_mfa, 5);
  v_max_failed_before_lockout := COALESCE(v_max_failed_before_lockout, 10);
  v_lockout_duration_minutes := COALESCE(v_lockout_duration_minutes, 30);
  v_mfa_duration_minutes := COALESCE(v_mfa_duration_minutes, 60);
  v_max_ip_attempts := COALESCE(v_max_ip_attempts, 20);
  
  -- Get user
  SELECT id, failed_login_attempts 
  INTO v_user_id, v_failed_attempts
  FROM public.users
  WHERE email = p_email AND is_active = true
  LIMIT 1;
  
  -- If user not found, don't update anything (prevent enumeration)
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, false, false;
    RETURN;
  END IF;
  
  -- Increment failed attempts
  v_failed_attempts := COALESCE(v_failed_attempts, 0) + 1;
  
  -- Check if we should block IP
  SELECT COUNT(*) INTO v_ip_failed_attempts
  FROM public.login_attempts
  WHERE ip_address = p_ip_address AND success = false
    AND attempted_at > NOW() - INTERVAL '24 hours';
  
  v_should_block_ip := v_ip_failed_attempts >= v_max_ip_attempts;
  
  -- Update user
  UPDATE public.users
  SET 
    failed_login_attempts = v_failed_attempts,
    last_failed_login_at = NOW(),
    mfa_required_until = CASE 
      WHEN v_failed_attempts >= v_max_failed_before_mfa THEN NOW() + (v_mfa_duration_minutes || ' minutes')::INTERVAL
      ELSE mfa_required_until
    END,
    account_locked_until = CASE 
      WHEN v_failed_attempts >= v_max_failed_before_lockout THEN NOW() + (v_lockout_duration_minutes || ' minutes')::INTERVAL
      ELSE account_locked_until
    END,
    account_locked_reason = CASE 
      WHEN v_failed_attempts >= v_max_failed_before_lockout THEN 'Too many failed login attempts'
      ELSE account_locked_reason
    END
  WHERE id = v_user_id;
  
  RETURN QUERY SELECT 
    v_failed_attempts >= v_max_failed_before_mfa,
    v_failed_attempts >= v_max_failed_before_lockout,
    v_should_block_ip;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    failed_login_attempts = 0,
    last_failed_login_at = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unlock account
CREATE OR REPLACE FUNCTION unlock_account(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    account_locked_until = NULL,
    account_locked_reason = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_login_security_status(VARCHAR, VARCHAR, UUID) TO anon;
GRANT EXECUTE ON FUNCTION record_failed_login(VARCHAR, VARCHAR, UUID) TO anon;



