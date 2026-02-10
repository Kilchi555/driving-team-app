-- Fix: Auto-unlock expired account locks in record_failed_login function
-- When account_locked_until has expired, reset all security flags and attempts

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

  -- ✅ NEW: Check if account lock has expired, and reset attempts if so
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
