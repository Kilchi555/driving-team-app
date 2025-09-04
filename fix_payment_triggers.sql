-- Fix für Payment Triggers - Deaktiviert automatische Überschreibung der total_amount_rappen
-- Erstellt: 2025-08-13
-- Problem: Trigger überschreibt korrekte Preise automatisch

-- 1. Trigger deaktivieren, der total_amount_rappen überschreibt
DROP TRIGGER IF EXISTS trigger_update_payment_total ON payment_items;

-- 2. Alternative: Trigger korrigieren, damit er nur läuft, wenn payment_items existieren
-- (aber das ist komplizierter, daher erstmal deaktivieren)

-- 3. Funktion deaktivieren (optional)
-- DROP FUNCTION IF EXISTS calculate_payment_total(UUID);

-- 4. Überprüfen, ob es weitere Trigger gibt
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'payments';

-- 5. Kommentar hinzufügen
COMMENT ON COLUMN payments.total_amount_rappen IS 'Wird jetzt direkt vom Code gesetzt, nicht mehr von Triggers überschrieben';
COMMENT ON COLUMN payments.subtotal_rappen IS 'Zwischensumme vor Rabatten';
COMMENT ON COLUMN payments.discount_amount_rappen IS 'Rabatt-Betrag in Rappen';

-- 6. Bestehende Daten korrigieren (falls nötig)
-- UPDATE payments 
-- SET total_amount_rappen = lesson_price_rappen + admin_fee_rappen + products_price_rappen - discount_amount_rappen
-- WHERE total_amount_rappen != (lesson_price_rappen + admin_fee_rappen + products_price_rappen - discount_amount_rappen);
