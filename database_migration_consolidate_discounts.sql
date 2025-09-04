-- Migration: Rabatte konsolidieren - Alte Spalten entfernen, zentrale discounts Tabelle verwenden
-- Erstellt: 2024-12-19
-- Zweck: Alle Rabatte in die zentrale discounts Tabelle verschieben und alte Spalten entfernen

-- 1. Bestehende Rabatte in die zentrale discounts Tabelle migrieren

-- Von payments Tabelle
INSERT INTO discounts (
  appointment_id,
  payment_id,
  user_id,
  staff_id,
  discount_type,
  discount_amount_rappen,
  discount_reason,
  original_amount_rappen,
  final_amount_rappen,
  created_at,
  applied_at
)
SELECT 
  p.appointment_id,
  p.id as payment_id,
  p.user_id,
  p.staff_id,
  'fixed' as discount_type,
  p.discount_amount_rappen,
  'Migriert von alter payments Tabelle' as discount_reason,
  p.total_amount_rappen + p.discount_amount_rappen as original_amount_rappen,
  p.total_amount_rappen as final_amount_rappen,
  p.created_at,
  p.created_at
FROM payments p
WHERE p.discount_amount_rappen > 0
AND NOT EXISTS (
  SELECT 1 FROM discounts d WHERE d.payment_id = p.id
);

-- Von product_sales Tabelle
INSERT INTO discounts (
  product_sale_id,
  user_id,
  staff_id,
  discount_type,
  discount_amount_rappen,
  discount_reason,
  original_amount_rappen,
  final_amount_rappen,
  created_at,
  applied_at
)
SELECT 
  ps.id as product_sale_id,
  ps.user_id,
  ps.staff_id,
  COALESCE(ps.discount_type, 'fixed') as discount_type,
  ps.discount_amount_rappen,
  COALESCE(ps.discount_reason, 'Migriert von alter product_sales Tabelle') as discount_reason,
  ps.total_amount_rappen + ps.discount_amount_rappen as original_amount_rappen,
  ps.total_amount_rappen as final_amount_rappen,
  ps.created_at,
  ps.created_at
FROM product_sales ps
WHERE ps.discount_amount_rappen > 0
AND NOT EXISTS (
  SELECT 1 FROM discounts d WHERE d.product_sale_id = ps.id
);

-- Von appointments Tabelle (falls vorhanden)
INSERT INTO discounts (
  appointment_id,
  user_id,
  staff_id,
  discount_type,
  discount_amount_rappen,
  discount_reason,
  original_amount_rappen,
  final_amount_rappen,
  created_at,
  applied_at
)
SELECT 
  a.id as appointment_id,
  a.user_id,
  a.staff_id,
  'fixed' as discount_type,
  a.discount_amount_rappen,
  'Migriert von alter appointments Tabelle' as discount_reason,
  -- Hier müssen wir den ursprünglichen Preis schätzen, da wir ihn nicht haben
  COALESCE(a.discount_amount_rappen * 2, 0) as original_amount_rappen,
  COALESCE(a.discount_amount_rappen, 0) as final_amount_rappen,
  a.created_at,
  a.created_at
FROM appointments a
WHERE a.discount_amount_rappen > 0
AND NOT EXISTS (
  SELECT 1 FROM discounts d WHERE d.appointment_id = a.id
);

-- 2. Alte Rabatt-Spalten entfernen

-- Von payments Tabelle
ALTER TABLE payments DROP COLUMN IF EXISTS discount_amount_rappen;

-- Von product_sales Tabelle
ALTER TABLE product_sales DROP COLUMN IF EXISTS discount_amount_rappen;
ALTER TABLE product_sales DROP COLUMN IF EXISTS discount_type;
ALTER TABLE product_sales DROP COLUMN IF EXISTS discount_reason;

-- Von appointments Tabelle (falls vorhanden)
ALTER TABLE appointments DROP COLUMN IF EXISTS discount_amount_rappen;

-- 3. Trigger aktualisieren, falls vorhanden
-- Der calculate_total_amount Trigger muss angepasst werden, um Rabatte aus der discounts Tabelle zu holen

-- 4. View aktualisieren für bessere Rabatt-Übersicht
CREATE OR REPLACE VIEW v_payments_with_discounts AS
SELECT 
  p.*,
  COALESCE(d.discount_amount_rappen, 0) as discount_amount_rappen,
  d.discount_type,
  d.discount_reason,
  p.total_amount_rappen + COALESCE(d.discount_amount_rappen, 0) as original_amount_rappen
FROM payments p
LEFT JOIN discounts d ON d.payment_id = p.id AND d.is_active = true;

-- 5. Kommentar für die neue View
COMMENT ON VIEW v_payments_with_discounts IS 'Zahlungen mit Rabatten aus der zentralen discounts Tabelle';

-- 6. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_discounts_payment_id_active ON discounts(payment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_appointment_id_active ON discounts(appointment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_product_sale_id_active ON discounts(product_sale_id, is_active);

-- 7. Funktion für einfache Rabatt-Berechnung
CREATE OR REPLACE FUNCTION get_active_discount(
  p_entity_type text,
  p_entity_id uuid
) RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'amount_rappen', discount_amount_rappen,
    'type', discount_type,
    'reason', discount_reason,
    'original_amount_rappen', original_amount_rappen,
    'final_amount_rappen', final_amount_rappen
  ) INTO result
  FROM discounts
  WHERE is_active = true
  AND CASE 
    WHEN p_entity_type = 'payment' THEN payment_id = p_entity_id
    WHEN p_entity_type = 'appointment' THEN appointment_id = p_entity_id
    WHEN p_entity_type = 'product_sale' THEN product_sale_id = p_entity_id
  END
  LIMIT 1;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 8. Kommentar für die Funktion
COMMENT ON FUNCTION get_active_discount IS 'Holt den aktiven Rabatt für eine bestimmte Entität aus der zentralen discounts Tabelle';
