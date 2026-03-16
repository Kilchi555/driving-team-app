-- Migration: add_student_withdrawal_preferences
-- Separate table for storing encrypted IBAN and withdrawal preferences

CREATE TABLE IF NOT EXISTS public.student_withdrawal_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  iban_encrypted TEXT NOT NULL,           -- AES-256 encrypted IBAN
  iban_last4 TEXT NOT NULL,               -- last 4 chars for display (e.g. "2957")
  account_holder TEXT NOT NULL,
  street TEXT,                            -- address of account holder (may differ from user)
  street_nr TEXT,
  zip TEXT,
  city TEXT,
  iban_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  iban_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  withdrawal_unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT student_withdrawal_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT student_withdrawal_preferences_user_id_key UNIQUE (user_id),
  CONSTRAINT student_withdrawal_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT student_withdrawal_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_withdrawal_prefs_user_id ON public.student_withdrawal_preferences USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_prefs_tenant_id ON public.student_withdrawal_preferences USING btree (tenant_id);

-- RLS
ALTER TABLE public.student_withdrawal_preferences ENABLE ROW LEVEL SECURITY;

-- Kunde kann nur seine eigenen Daten lesen (iban_encrypted nie direkt zurückgegeben)
CREATE POLICY "customer_read_own_withdrawal_prefs"
  ON public.student_withdrawal_preferences
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Kunde kann eigene Prefs einfügen/updaten (via API mit service_role)
CREATE POLICY "customer_upsert_own_withdrawal_prefs"
  ON public.student_withdrawal_preferences
  FOR ALL
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Service role hat immer Zugriff (für Admin-Export)
CREATE POLICY "service_role_full_access_withdrawal_prefs"
  ON public.student_withdrawal_preferences
  FOR ALL
  TO service_role
  USING (true);

-- Extend credit_transactions status für withdrawal flow
-- status: 'completed' | 'pending' | 'failed' | 'withdrawal_pending' | 'withdrawal_completed'
COMMENT ON COLUMN public.credit_transactions.status IS 'completed | pending | failed | withdrawal_pending | withdrawal_completed';

-- If table already exists, add address columns (idempotent)
ALTER TABLE public.student_withdrawal_preferences ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.student_withdrawal_preferences ADD COLUMN IF NOT EXISTS street_nr TEXT;
ALTER TABLE public.student_withdrawal_preferences ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE public.student_withdrawal_preferences ADD COLUMN IF NOT EXISTS city TEXT;
