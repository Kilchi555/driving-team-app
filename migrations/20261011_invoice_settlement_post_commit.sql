-- Durable post-commit recovery state for mark-invoice-paid.
-- Tracks payments-sync / staff-POS / wallet-credit separately from core settlement.
-- ALSO adds a partial unique index so invoice wallet deposits cannot double-insert.
--
-- NOT applied by this PR. Apply only via approved non-production then production rollout.
-- Does not rewrite historical data.

CREATE TABLE IF NOT EXISTS public.invoice_settlement_post_commit (
  invoice_id uuid PRIMARY KEY REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  payments_sync_status text NOT NULL DEFAULT 'pending'
    CHECK (payments_sync_status IN ('pending', 'completed', 'failed', 'not_required')),
  staff_pos_status text NOT NULL DEFAULT 'pending'
    CHECK (staff_pos_status IN ('pending', 'completed', 'failed', 'not_required')),
  wallet_credit_status text NOT NULL DEFAULT 'pending'
    CHECK (wallet_credit_status IN ('pending', 'completed', 'failed', 'not_required')),
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_settlement_post_commit_tenant
  ON public.invoice_settlement_post_commit (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_settlement_post_commit_pending
  ON public.invoice_settlement_post_commit (tenant_id, invoice_id)
  WHERE payments_sync_status IN ('pending', 'failed')
     OR staff_pos_status IN ('pending', 'failed')
     OR wallet_credit_status IN ('pending', 'failed');

ALTER TABLE public.invoice_settlement_post_commit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_settlement_post_commit_service_role
  ON public.invoice_settlement_post_commit;
CREATE POLICY invoice_settlement_post_commit_service_role
  ON public.invoice_settlement_post_commit
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- One completed invoice wallet deposit per invoice reference.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_invoice_deposit_uidx
  ON public.credit_transactions (tenant_id, reference_id)
  WHERE reference_type = 'invoice'
    AND transaction_type IN ('deposit', 'credit_product_purchase')
    AND status = 'completed';

COMMENT ON TABLE public.invoice_settlement_post_commit IS
  'Post-commit recovery for mark-invoice-paid. Core settlement is atomic in mark_invoice_paid_core; this table tracks downstream payments sync, staff-POS credits, and wallet credits.';
