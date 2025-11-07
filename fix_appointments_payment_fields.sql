-- Fix: Entferne automatische Zahlungsfelder aus appointments Tabelle
-- Diese sollten nur in payments Tabelle sein
-- Date: 2025-01-XX
-- Description: Cleanup - Move payment fields from appointments to payments only

-- ============================================================================
-- 1. ENTFERNE automatische Zahlungsfelder aus appointments
-- ============================================================================
-- Diese Felder gehören in die payments Tabelle, nicht in appointments!

DO $$
BEGIN
  -- Entferne automatic_payment_consent
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'automatic_payment_consent') THEN
    ALTER TABLE appointments DROP COLUMN automatic_payment_consent;
    RAISE NOTICE '✅ Removed automatic_payment_consent from appointments';
  END IF;

  -- Entferne automatic_payment_consent_at
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'automatic_payment_consent_at') THEN
    ALTER TABLE appointments DROP COLUMN automatic_payment_consent_at;
    RAISE NOTICE '✅ Removed automatic_payment_consent_at from appointments';
  END IF;

  -- Entferne scheduled_payment_date
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'scheduled_payment_date') THEN
    ALTER TABLE appointments DROP COLUMN scheduled_payment_date;
    RAISE NOTICE '✅ Removed scheduled_payment_date from appointments';
  END IF;

  -- Entferne payment_method_id
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'payment_method_id') THEN
    ALTER TABLE appointments DROP COLUMN payment_method_id;
    RAISE NOTICE '✅ Removed payment_method_id from appointments';
  END IF;

  -- Entferne automatic_payment_processed
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'automatic_payment_processed') THEN
    ALTER TABLE appointments DROP COLUMN automatic_payment_processed;
    RAISE NOTICE '✅ Removed automatic_payment_processed from appointments';
  END IF;

  -- Entferne automatic_payment_processed_at
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'automatic_payment_processed_at') THEN
    ALTER TABLE appointments DROP COLUMN automatic_payment_processed_at;
    RAISE NOTICE '✅ Removed automatic_payment_processed_at from appointments';
  END IF;

  RAISE NOTICE '✅ Cleanup completed: appointments table now only has confirmation_token';
END $$;

-- ============================================================================
-- 2. ENTFERNE falsche Indizes von appointments (falls vorhanden)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE tablename = 'appointments' AND indexname = 'idx_appointments_scheduled_payment') THEN
    DROP INDEX IF EXISTS idx_appointments_scheduled_payment;
    RAISE NOTICE '✅ Removed idx_appointments_scheduled_payment index';
  END IF;
END $$;

-- ============================================================================
-- 3. ENTFERNE falsche Kommentare von appointments (falls vorhanden)
-- ============================================================================
DO $$
BEGIN
  -- Entferne Kommentare, die nicht mehr relevant sind
  COMMENT ON COLUMN appointments.automatic_payment_consent IS NULL;
  COMMENT ON COLUMN appointments.automatic_payment_consent_at IS NULL;
  COMMENT ON COLUMN appointments.scheduled_payment_date IS NULL;
  COMMENT ON COLUMN appointments.payment_method_id IS NULL;
  COMMENT ON COLUMN appointments.automatic_payment_processed IS NULL;
  COMMENT ON COLUMN appointments.automatic_payment_processed_at IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if comments don't exist
    NULL;
END $$;

-- ============================================================================
-- 4. BESTÄTIGUNG: Zeige was in appointments bleiben sollte
-- ============================================================================
SELECT 
  'appointments' as table_name,
  column_name,
  data_type,
  '✅ Correct - should remain' as status
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name = 'confirmation_token'

UNION ALL

SELECT 
  'appointments' as table_name,
  column_name,
  'REMOVED' as data_type,
  '❌ Should not exist - check if removal worked' as status
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name IN (
    'automatic_payment_consent',
    'automatic_payment_consent_at',
    'scheduled_payment_date',
    'payment_method_id',
    'automatic_payment_processed',
    'automatic_payment_processed_at'
  );

-- ============================================================================
-- 5. BESTÄTIGUNG: Zeige was in payments sein sollte
-- ============================================================================
SELECT 
  'payments' as table_name,
  column_name,
  data_type,
  '✅ Correct - should be here' as status
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'automatic_payment_consent',
    'automatic_payment_consent_at',
    'scheduled_payment_date',
    'payment_method_id',
    'automatic_payment_processed',
    'automatic_payment_processed_at'
  )
ORDER BY column_name;

