-- Add show_in_shop flag to products table
-- Controls which products appear in the public /shop page
-- Separate from is_active (which controls whether the product can be used at all)

ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_shop boolean NOT NULL DEFAULT false;

-- Set existing voucher/customer-facing products to show_in_shop = true
-- Fahrzeug-Miete, Admin-Pauschale etc. remain false (internal-only)
UPDATE products SET show_in_shop = true
WHERE category IN ('Gutschein', 'Lehrmittel', 'Zubehör', 'Bücher')
   OR is_voucher = true
   OR allow_custom_amount = true;

-- Verify
SELECT id, name, category, is_voucher, show_in_shop
FROM products
ORDER BY tenant_id, display_order;
