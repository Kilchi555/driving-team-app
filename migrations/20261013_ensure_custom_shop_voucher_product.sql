-- Ensure tenants with voucher_creation enabled have a custom-amount shop voucher product.
-- Required so /shop can sell individual vouchers through create-payment (real product UUID + bounds).

INSERT INTO products (
  tenant_id,
  name,
  description,
  price_rappen,
  category,
  is_voucher,
  allow_custom_amount,
  min_amount_rappen,
  max_amount_rappen,
  is_active,
  show_in_shop,
  display_order
)
SELECT
  t.id,
  'Individueller Gutschein',
  'Gutschein mit individuellem Betrag (im Shop gestaltbar)',
  0,
  'Gutscheine',
  true,
  true,
  100,      -- CHF 1.00
  100000,   -- CHF 1000.00
  true,
  true,
  0
FROM tenants t
WHERE t.is_active = true
  AND EXISTS (
    SELECT 1
    FROM tenant_settings s
    WHERE s.tenant_id = t.id
      AND s.category = 'features'
      AND s.setting_key = 'voucher_creation'
      AND (
        (s.setting_value::jsonb ? 'enabled' AND (s.setting_value::jsonb ->> 'enabled')::boolean = true)
        OR (
          NOT (s.setting_value::jsonb ? 'enabled')
          AND (s.setting_value::jsonb ? 'displayName')
        )
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM products p
    WHERE p.tenant_id = t.id
      AND p.is_voucher = true
      AND p.allow_custom_amount = true
      AND COALESCE(p.is_active, true) = true
  );
