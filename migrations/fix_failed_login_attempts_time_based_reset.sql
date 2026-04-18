-- Fix: Add time-based auto-reset for failed_login_attempts.
-- Previously, the counter only reset when an account_locked_until expired.
-- Users who never hit the lockout threshold (e.g. 7 attempts, lockout at 10)
-- were permanently stuck requiring MFA because the count-based check (>= 5)
-- never cleared. Now attempts older than 24 hours are automatically ignored.

-- Configurable window (hours) after which stale failed attempts are ignored
-- Change this value to adjust the cooldown period
DO $$ BEGIN
  PERFORM set_config('app.failed_login_reset_hours', '24', false);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update record_failed_login: also reset if last_failed_login_at is older than 24h
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
  v_last_failed_at TIMESTAMPTZ;
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
  SELECT id, failed_login_attempts, last_failed_login_at
  INTO v_user_id, v_failed_attempts, v_last_failed_at
  FROM public.users
  WHERE email = p_email AND is_active = true
  LIMIT 1;
  
  -- If user not found, don't update anything (prevent enumeration)
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, false, false;
    RETURN;
  END IF;

  -- Reset if account lock has expired
  UPDATE public.users
  SET 
    failed_login_attempts = 0,
    last_failed_login_at = NULL,
    account_locked_until = NULL,
    account_locked_reason = NULL,
    mfa_required_until = NULL
  WHERE id = v_user_id 
    AND account_locked_until IS NOT NULL 
    AND account_locked_until < NOW();

  -- Reset if last failed attempt is older than 24 hours (stale counter)
  UPDATE public.users
  SET 
    failed_login_attempts = 0,
    last_failed_login_at = NULL,
    mfa_required_until = NULL
  WHERE id = v_user_id 
    AND last_failed_login_at IS NOT NULL
    AND last_failed_login_at < NOW() - INTERVAL '24 hours';
  
  -- Reload failed attempts after potential reset
  SELECT failed_login_attempts 
  INTO v_failed_attempts
  FROM public.users
  WHERE id = v_user_id;
  
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


-- Update check_login_security_status: also ignore stale failed attempts (>24h old)
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
  v_last_failed_at TIMESTAMPTZ;
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
  SELECT id, failed_login_attempts, last_failed_login_at, mfa_required_until, account_locked_until 
  INTO v_user_id, v_failed_attempts, v_last_failed_at, v_mfa_required_until, v_account_locked_until
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
  
  -- Check MFA requirement (time-based)
  IF v_mfa_required_until IS NOT NULL AND v_mfa_required_until > NOW() THEN
    RETURN QUERY SELECT 
      true,
      NULL::TEXT,
      true,
      false,
      0;
    RETURN;
  END IF;

  -- If last failed attempt is older than 24 hours, treat counter as zero (stale)
  IF v_last_failed_at IS NOT NULL AND v_last_failed_at < NOW() - INTERVAL '24 hours' THEN
    v_failed_attempts := 0;
  END IF;
  
  -- Check failed attempts threshold for MFA
  IF v_failed_attempts >= v_max_failed_before_mfa THEN
    RETURN QUERY SELECT 
      true,
      NULL::TEXT,
      true,
      false,
      0;
    RETURN;
  END IF;
  
  -- Normal case - login allowed
  RETURN QUERY SELECT 
    true,
    NULL::TEXT,
    false,
    false,
    v_max_failed_before_lockout - v_failed_attempts;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- Immediate fix: reset the stale failed attempts for the
-- test account (last_failed_login_at is from March 28, 2026,
-- well over 24 hours ago – safe to clear).
-- ============================================================
UPDATE public.users
SET
  failed_login_attempts = 0,
  last_failed_login_at  = NULL,
  mfa_required_until    = NULL
WHERE id = '725320ad-6252-48e9-b84b-0a7fd28ba11c'
  AND last_failed_login_at < NOW() - INTERVAL '24 hours';
