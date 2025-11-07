-- ============================================================================
-- Skript: Löscht alle Appointments ohne zugehöriges Payment (HARD DELETE)
-- Beschreibung: Löscht ALLE Appointments ohne Payment und ALLE verknüpften 
--               Daten (discount_sales, appointment_discounts, invoices, etc.) PERMANENT
-- HINWEIS: product_sales und product_sale_items werden optional gelöscht (Schritte 4b und 4c),
--          falls die Spalte product_sales.appointment_id in der Datenbank existiert.
--          Falls nicht, müssen diese manuell gelöscht werden oder die Schritte 4b/4c überspringen.
-- WICHTIG: Führt ein HARD DELETE durch - Daten werden PERMANENT gelöscht!
--          Diese Aktion kann NICHT rückgängig gemacht werden!
-- ============================================================================

-- ============================================================================
-- SCHRITT 0: Prüfe spezifischen Termin (Optional)
-- ============================================================================
-- Prüfe, ob ein bestimmter Termin gelöscht werden würde:
-- Ersetze 'TERMIN_ID_HIER' mit der tatsächlichen Appointment-ID

-- Beispiel für Termin-ID: 27de1ee0-8a6c-42c7-a970-c5030585fc46
/*
SELECT 
    a.id,
    a.title,
    a.start_time,
    a.status,
    (SELECT COUNT(*) FROM payments WHERE appointment_id = a.id AND (deleted_at IS NULL)) as payment_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM payments WHERE appointment_id = a.id AND (deleted_at IS NULL)) > 0 
        THEN 'WIRD NICHT GELÖSCHT (hat Payment)'
        WHEN a.deleted_at IS NOT NULL 
        THEN 'WIRD NICHT GELÖSCHT (bereits gelöscht)'
        ELSE 'WIRD GELÖSCHT (kein Payment)'
    END as status
FROM appointments a
WHERE a.id = '27de1ee0-8a6c-42c7-a970-c5030585fc46';
*/

-- ============================================================================
-- SCHRITT 1: Übersicht - Zeige alle betroffenen Appointments
-- ============================================================================
-- Führe diese Query ZUERST aus, um zu sehen, was gelöscht wird:

SELECT 
    a.id,
    a.title,
    a.start_time,
    a.status,
    a.created_at,
    a.user_id,
    a.staff_id,
    (SELECT COUNT(*) FROM payments WHERE appointment_id = a.id AND (deleted_at IS NULL)) as payment_count,
    (SELECT COUNT(*) FROM discount_sales WHERE appointment_id = a.id) as discount_sales_count,
    (SELECT COUNT(*) FROM appointment_discounts WHERE appointment_id = a.id) as appointment_discounts_count,
    (SELECT COUNT(*) FROM invoices WHERE appointment_id = a.id) as invoices_count,
    (SELECT COUNT(*) FROM invoice_items WHERE appointment_id = a.id) as invoice_items_count
FROM appointments a
WHERE (a.deleted_at IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM payments 
      WHERE appointment_id = a.id 
      AND (deleted_at IS NULL)
  )
ORDER BY a.created_at DESC;

-- ============================================================================
-- SCHRITT 2: HARD DELETE - Führe diese Transaktion aus, um zu löschen
-- ============================================================================
-- ⚠️ WARNUNG: Diese Aktion löscht Daten PERMANENT!
-- ⚠️ Empfohlen: Führe zuerst ROLLBACK aus, dann nochmal mit COMMIT

BEGIN;

-- Hilfs-CTE: Alle betroffenen Appointment-IDs
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
-- 1. Lösche invoice_items die zu betroffenen Appointments gehören
DELETE FROM invoice_items
WHERE appointment_id IN (SELECT id FROM appointments_to_delete);

-- 2. Lösche invoices die zu betroffenen Appointments gehören
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
DELETE FROM invoices
WHERE appointment_id IN (SELECT id FROM appointments_to_delete);

-- 3. Lösche appointment_discounts die zu betroffenen Appointments gehören
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
DELETE FROM appointment_discounts
WHERE appointment_id IN (SELECT id FROM appointments_to_delete);

-- 4. Lösche discount_sales die zu betroffenen Appointments gehören
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
DELETE FROM discount_sales
WHERE appointment_id IN (SELECT id FROM appointments_to_delete);

-- 4b. OPTIONAL: Lösche product_sale_items die zu betroffenen product_sales gehören
-- WICHTIG: Nur ausführen, wenn product_sales.appointment_id existiert!
-- Falls Spalte nicht existiert, diesen Block überspringen oder manuell anpassen
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
DELETE FROM product_sale_items
WHERE product_sale_id IN (
    SELECT id FROM product_sales
    WHERE appointment_id IN (SELECT id FROM appointments_to_delete)
);

-- 4c. OPTIONAL: Lösche product_sales die zu betroffenen Appointments gehören
-- WICHTIG: Nur ausführen, wenn product_sales.appointment_id existiert!
-- Falls Spalte nicht existiert, diesen Block überspringen oder manuell anpassen
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
DELETE FROM product_sales
WHERE appointment_id IN (SELECT id FROM appointments_to_delete);

-- 5. Lösche die betroffenen Appointments selbst
WITH appointments_to_delete AS (
    SELECT id FROM appointments 
    WHERE (deleted_at IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM payments 
          WHERE appointment_id = appointments.id 
          AND (deleted_at IS NULL)
      )
)
DELETE FROM appointments
WHERE id IN (SELECT id FROM appointments_to_delete);

-- Zeige Ergebnis: Anzahl verbleibender Appointments ohne Payment
SELECT 
    'Verbleibende Appointments ohne Payment:' as info,
    COUNT(*) as count
FROM appointments
WHERE (deleted_at IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM payments 
      WHERE appointment_id = appointments.id 
      AND (deleted_at IS NULL)
  );

-- ROLLBACK;  -- Zum Testen: Transaktion rückgängig machen
-- COMMIT;  -- Zum tatsächlichen Löschen: Transaktion bestätigen (AUSKOMMENTIEREN für Test)

-- ============================================================================
-- SCHRITT 3: Überprüfung nach dem Löschen
-- ============================================================================
-- Führe diese Query aus, um zu überprüfen, ob alle Appointments ohne Payment
-- gelöscht wurden:

SELECT 
    COUNT(*) as appointments_without_payment_remaining
FROM appointments
WHERE (deleted_at IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM payments 
      WHERE appointment_id = appointments.id 
      AND (deleted_at IS NULL)
  );

-- Sollte 0 zurückgeben, wenn alles korrekt gelöscht wurde

