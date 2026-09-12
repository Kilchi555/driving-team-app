-- Phase 1 staff price authority: JWT / PostgREST cannot plant payment amounts.
-- Do NOT apply this to production from the remediation agent.
--
-- Live capability before this file (F-05a + prevent_client_payment_mutation):
--   clients cannot UPDATE status/total/discount
--   staff/admin still INSERT/UPDATE payments via Data API, including
--     lesson_price_rappen and total_amount_rappen
--
-- After apply:
--   authenticated INSERT on payments is rejected by trigger
--   authenticated/anon UPDATE of monetary columns is rejected by trigger
--   status / method / reminder / wallee id updates remain allowed
--   service_role (Nuxt APIs, Wallee webhooks) unchanged
--   anon shop INSERT policy remains (standalone, lesson_price = 0)
--
-- Affected table: public.payments
-- RLS impact: existing staff INSERT/UPDATE policies stay; the trigger is
--   the monetary authority because Postgres RLS is not column-granular.
-- Blast radius: staff EventModal / paymentService / usePaymentStatus
--   monetary PostgREST writes fail. Status-only updates still work.
--   Shop guest checkout via anon INSERT still works. Staff shop checkout
--   must use /api/shop/create-payment (already service_role).
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_prevent_jwt_payment_monetary_mutation ON public.payments;
--   DROP FUNCTION IF EXISTS public.prevent_jwt_payment_monetary_mutation();
--   Recreate "anon_insert_shop_payment" TO anon, authenticated if needed.

BEGIN;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Shop guest checkout stays on the anon key. Authenticated staff must not
-- piggy-back the shop INSERT policy to plant totals.
DROP POLICY IF EXISTS "anon_insert_shop_payment" ON public.payments;
CREATE POLICY "anon_insert_shop_payment" ON public.payments
  FOR INSERT
  TO anon
  WITH CHECK (
    payment_status = 'pending'
    AND payment_method = 'wallee'
    AND currency = 'CHF'
    AND appointment_id IS NULL
    AND COALESCE(lesson_price_rappen, 0) = 0
    AND total_amount_rappen > 0
    AND COALESCE(products_price_rappen, 0) >= 0
    AND COALESCE(discount_amount_rappen, 0) >= 0
    AND COALESCE(admin_fee_rappen, 0) >= 0
    AND tenant_id IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.prevent_jwt_payment_monetary_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(auth.role(), '') = 'authenticated' THEN
      RAISE EXCEPTION 'payments_jwt_insert_forbidden';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.lesson_price_rappen IS DISTINCT FROM OLD.lesson_price_rappen
       OR NEW.admin_fee_rappen IS DISTINCT FROM OLD.admin_fee_rappen
       OR NEW.products_price_rappen IS DISTINCT FROM OLD.products_price_rappen
       OR NEW.discount_amount_rappen IS DISTINCT FROM OLD.discount_amount_rappen
       OR NEW.voucher_discount_rappen IS DISTINCT FROM OLD.voucher_discount_rappen
       OR NEW.credit_used_rappen IS DISTINCT FROM OLD.credit_used_rappen
       OR NEW.total_amount_rappen IS DISTINCT FROM OLD.total_amount_rappen THEN
      RAISE EXCEPTION 'payments_jwt_monetary_update_forbidden';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_jwt_payment_monetary_mutation ON public.payments;
CREATE TRIGGER trg_prevent_jwt_payment_monetary_mutation
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_jwt_payment_monetary_mutation();

COMMENT ON FUNCTION public.prevent_jwt_payment_monetary_mutation() IS
  'Phase 1 (2026-09-11): authenticated JWT cannot INSERT payments or UPDATE monetary columns. Amounts go through service_role APIs that quote server-side.';

COMMIT;
