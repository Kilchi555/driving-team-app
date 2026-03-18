-- Public shop checkout: allow anon inserts into payments under strict conditions.
-- Keep policy resilient: avoid cross-table checks that can fail due to separate RLS.

DROP POLICY IF EXISTS "anon_insert_shop_payment" ON public.payments;

CREATE POLICY "anon_insert_shop_payment" ON public.payments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Only pending Wallee payments from checkout
    payment_status = 'pending'
    AND payment_method = 'wallee'
    AND currency = 'CHF'

    -- Standalone shop payments only
    AND appointment_id IS NULL
    AND COALESCE(lesson_price_rappen, 0) = 0

    -- Basic numeric safety
    AND total_amount_rappen > 0
    AND COALESCE(products_price_rappen, 0) >= 0
    AND COALESCE(discount_amount_rappen, 0) >= 0
    AND COALESCE(admin_fee_rappen, 0) >= 0

    -- Tenant reference must be present (UUID validity enforced in API layer)
    AND tenant_id IS NOT NULL
  );

COMMENT ON POLICY "anon_insert_shop_payment" ON public.payments
  IS 'Allows strict anon INSERT for standalone shop checkout only.';
