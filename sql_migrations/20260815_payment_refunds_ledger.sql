-- Wallee refund ledger: multiple / partial refunds per payment.
-- refunded_amount_rappen on payments is the reserved+successful Wallee total.

ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS refunded_amount_rappen integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN payments.refunded_amount_rappen IS
  'Sum of successful + pending Wallee refunds in Rappen. Remaining refundable = captured (total - credit, 5-rappen) minus this.';

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  wallee_refund_id text,
  amount_rappen integer NOT NULL CHECK (amount_rappen > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'successful', 'failed')),
  reason text,
  idempotency_key text NOT NULL,
  initiated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id
  ON public.payment_refunds (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_wallee_refund_id
  ON public.payment_refunds (wallee_refund_id)
  WHERE wallee_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_refunds_tenant_id
  ON public.payment_refunds (tenant_id);

COMMENT ON TABLE public.payment_refunds IS
  'One row per Wallee refund attempt. Server-only; APIs use the service role.';

-- Backfill the one known successful Wallee refund
UPDATE public.payments
SET refunded_amount_rappen = GREATEST(
  0,
  (ROUND((total_amount_rappen - COALESCE(credit_used_rappen, 0)) / 5.0) * 5)::integer
)
WHERE wallee_refund_id IS NOT NULL
  AND payment_status = 'refunded'
  AND COALESCE(refunded_amount_rappen, 0) = 0;

INSERT INTO public.payment_refunds (
  tenant_id, payment_id, wallee_refund_id, amount_rappen, status, reason, idempotency_key
)
SELECT
  p.tenant_id,
  p.id,
  p.wallee_refund_id,
  p.refunded_amount_rappen,
  'successful',
  'Backfill existing wallee_refund_id',
  'backfill-' || p.id::text
FROM public.payments p
WHERE p.wallee_refund_id IS NOT NULL
  AND p.refunded_amount_rappen > 0
  AND p.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_refunds r WHERE r.payment_id = p.id AND r.wallee_refund_id = p.wallee_refund_id
  );

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_refunds_no_client_access ON public.payment_refunds;
CREATE POLICY payment_refunds_no_client_access ON public.payment_refunds
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS refund_requests_no_client_access ON public.refund_requests;
CREATE POLICY refund_requests_no_client_access ON public.refund_requests
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
