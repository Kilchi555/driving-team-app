-- Tenant registration abuse protection (2026-10-14)
-- Apply in staging first. Do NOT apply via agent to production without rollout approval.
--
-- Fixes:
-- 1) rate_limit_logs.operation CHECK rejected 'tenant_register' / 'create_admin' → silent fail-open
-- 2) pending email verification columns + single-use hashed token table

BEGIN;

-- ─── 1. rate_limit_logs: allow dynamic operation names ───────────────────────
ALTER TABLE public.rate_limit_logs
  DROP CONSTRAINT IF EXISTS rate_limit_logs_operation_check;

-- Keep a soft length bound; do not re-introduce a closed enum of operations.
ALTER TABLE public.rate_limit_logs
  ALTER COLUMN operation TYPE VARCHAR(80);

COMMENT ON COLUMN public.rate_limit_logs.operation IS
  'Operation key for rate limiting (e.g. login, register, tenant_register, create_admin). Not a closed enum.';

-- Atomic check+insert used by server/utils/rate-limiter.ts (service_role only).
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_operation text,
  p_ip_address text,
  p_max_requests integer,
  p_window_seconds integer,
  p_email text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  allowed boolean,
  request_count integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := now() - make_interval(secs => GREATEST(p_window_seconds, 1));
  v_count integer;
  v_oldest timestamptz;
  v_allowed boolean;
  v_retry integer;
BEGIN
  IF p_operation IS NULL OR length(trim(p_operation)) = 0 THEN
    RAISE EXCEPTION 'operation required';
  END IF;
  IF p_ip_address IS NULL OR length(trim(p_ip_address)) = 0 THEN
    RAISE EXCEPTION 'ip_address required';
  END IF;
  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    RAISE EXCEPTION 'max_requests invalid';
  END IF;

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest
  FROM public.rate_limit_logs
  WHERE operation = p_operation
    AND ip_address = p_ip_address
    AND created_at >= v_window_start;

  v_allowed := (v_count < p_max_requests);
  v_count := v_count + 1;

  INSERT INTO public.rate_limit_logs (
    operation, ip_address, email, status, request_count, max_requests, window_seconds, tenant_id
  ) VALUES (
    p_operation,
    p_ip_address,
    NULLIF(lower(trim(p_email)), ''),
    CASE WHEN v_allowed THEN 'allowed' ELSE 'blocked' END,
    v_count,
    p_max_requests,
    p_window_seconds,
    p_tenant_id
  );

  IF v_allowed THEN
    v_retry := GREATEST(1, p_window_seconds);
  ELSE
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((COALESCE(v_oldest, now()) + make_interval(secs => p_window_seconds)) - now())))::integer
    );
  END IF;

  allowed := v_allowed;
  request_count := v_count;
  retry_after_seconds := v_retry;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer, text, uuid) TO service_role;

-- ─── 2. Tenant registration verification columns ─────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_status text;

UPDATE public.tenants
SET registration_status = 'active',
    email_verified_at = COALESCE(email_verified_at, created_at)
WHERE registration_status IS NULL;

ALTER TABLE public.tenants
  ALTER COLUMN registration_status SET DEFAULT 'active';

COMMENT ON COLUMN public.tenants.email_verified_at IS
  'When contact_email ownership was verified for public self-registration. NULL = unverified.';
COMMENT ON COLUMN public.tenants.registration_status IS
  'pending_email_verification | email_verified | active. Legacy rows backfilled to active.';

-- ─── 3. Single-use email verification tokens (store hash only) ───────────────
CREATE TABLE IF NOT EXISTS public.tenant_registration_email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_ip text
);

CREATE INDEX IF NOT EXISTS idx_tenant_reg_email_tokens_tenant
  ON public.tenant_registration_email_tokens (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_reg_email_tokens_expires
  ON public.tenant_registration_email_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.tenant_registration_email_tokens ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: service_role only (bypasses RLS).
COMMENT ON TABLE public.tenant_registration_email_tokens IS
  'Hashed single-use tokens for public tenant registration email verification. Never store raw tokens.';

COMMIT;
