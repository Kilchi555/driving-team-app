-- FINALE VALIDIERUNG: Prüft ob alle Strukturen korrekt sind
-- Nach Ausführung der Cleanup-Migration

-- ============================================================================
-- 1. VALIDIERUNG: appointments sollte NUR confirmation_token haben
-- ============================================================================
SELECT 
  'appointments' as table_name,
  CASE 
    WHEN COUNT(*) = 1 AND MAX(column_name) = 'confirmation_token' THEN '✅ KORREKT'
    ELSE '❌ FEHLER: Sollte nur confirmation_token haben'
  END as validation_status,
  array_agg(column_name ORDER BY column_name) as vorhandene_spalten
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name IN (
    'confirmation_token',
    'automatic_payment_consent',
    'automatic_payment_consent_at',
    'scheduled_payment_date',
    'payment_method_id',
    'automatic_payment_processed',
    'automatic_payment_processed_at'
  )
GROUP BY table_name;

-- ============================================================================
-- 2. VALIDIERUNG: payments sollte ALLE automatischen Zahlungsfelder haben
-- ============================================================================
WITH expected_payment_fields AS (
  SELECT unnest(ARRAY[
    'automatic_payment_consent',
    'automatic_payment_consent_at',
    'scheduled_payment_date',
    'payment_method_id',
    'automatic_payment_processed',
    'automatic_payment_processed_at'
  ]) as expected_column
),
actual_payment_fields AS (
  SELECT column_name as actual_column
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
)
SELECT 
  'payments' as table_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM expected_payment_fields) = (SELECT COUNT(*) FROM actual_payment_fields) 
    THEN '✅ KORREKT: Alle 6 Felder vorhanden'
    ELSE '❌ FEHLER: Felder fehlen'
  END as validation_status,
  (SELECT COUNT(*) FROM actual_payment_fields)::text || ' von ' || (SELECT COUNT(*) FROM expected_payment_fields)::text || ' Feldern vorhanden' as details;

-- ============================================================================
-- 3. VALIDIERUNG: customer_payment_methods Struktur
-- ============================================================================
WITH expected_cpm_fields AS (
  SELECT unnest(ARRAY[
    'id', 'user_id', 'tenant_id', 'wallee_token', 'wallee_customer_id',
    'display_name', 'payment_method_type', 'is_default', 'expires_at',
    'metadata', 'is_active', 'created_at', 'updated_at'
  ]) as expected_column
),
actual_cpm_fields AS (
  SELECT column_name as actual_column
  FROM information_schema.columns
  WHERE table_name = 'customer_payment_methods'
    AND column_name IN (
      'id', 'user_id', 'tenant_id', 'wallee_token', 'wallee_customer_id',
      'display_name', 'payment_method_type', 'is_default', 'expires_at',
      'metadata', 'is_active', 'created_at', 'updated_at'
    )
)
SELECT 
  'customer_payment_methods' as table_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM expected_cpm_fields) = (SELECT COUNT(*) FROM actual_cpm_fields) 
    THEN '✅ KORREKT: Alle Felder vorhanden'
    ELSE '❌ FEHLER: Felder fehlen'
  END as validation_status,
  (SELECT COUNT(*) FROM actual_cpm_fields)::text || ' von ' || (SELECT COUNT(*) FROM expected_cpm_fields)::text || ' Feldern vorhanden' as details;

-- ============================================================================
-- 4. VALIDIERUNG: Foreign Keys
-- ============================================================================
SELECT 
  'Foreign Keys' as check_type,
  tc.table_name || '.' || kcu.column_name as from_column,
  ccu.table_name || '.' || ccu.column_name as to_column,
  CASE 
    WHEN tc.table_name = 'customer_payment_methods' AND kcu.column_name IN ('user_id', 'tenant_id') THEN '✅ KORREKT'
    WHEN tc.table_name = 'payments' AND kcu.column_name = 'payment_method_id' THEN '✅ KORREKT'
    ELSE '⚠️ Unerwarteter Foreign Key'
  END as validation_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (
    (tc.table_name = 'customer_payment_methods' AND kcu.column_name IN ('user_id', 'tenant_id'))
    OR (tc.table_name = 'payments' AND kcu.column_name = 'payment_method_id')
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 5. VALIDIERUNG: Wichtige Indizes
-- ============================================================================
WITH expected_indexes AS (
  SELECT unnest(ARRAY[
    'idx_appointments_confirmation_token',
    'idx_payments_scheduled_payment',
    'idx_payments_payment_method_id',
    'idx_customer_payment_methods_user_id',
    'idx_customer_payment_methods_tenant_id',
    'idx_customer_payment_methods_wallee_customer',
    'idx_customer_payment_methods_default'
  ]) as expected_index
),
actual_indexes AS (
  SELECT indexname as actual_index
  FROM pg_indexes
  WHERE tablename IN ('appointments', 'payments', 'customer_payment_methods')
    AND indexname IN (
      'idx_appointments_confirmation_token',
      'idx_payments_scheduled_payment',
      'idx_payments_payment_method_id',
      'idx_customer_payment_methods_user_id',
      'idx_customer_payment_methods_tenant_id',
      'idx_customer_payment_methods_wallee_customer',
      'idx_customer_payment_methods_default'
    )
)
SELECT 
  'Indizes' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM expected_indexes) <= (SELECT COUNT(*) FROM actual_indexes) 
    THEN '✅ KORREKT: Wichtige Indizes vorhanden'
    ELSE '⚠️ WARNUNG: Einige Indizes fehlen'
  END as validation_status,
  (SELECT COUNT(*) FROM actual_indexes)::text || ' von mindestens ' || (SELECT COUNT(*) FROM expected_indexes)::text || ' erwarteten Indizes' as details;

-- ============================================================================
-- 6. VALIDIERUNG: RLS Policies für customer_payment_methods
-- ============================================================================
SELECT 
  'RLS Policies' as check_type,
  CASE 
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'customer_payment_methods') = true 
         AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'customer_payment_methods') >= 5
    THEN '✅ KORREKT: RLS aktiv mit Policies'
    ELSE '❌ FEHLER: RLS nicht korrekt konfiguriert'
  END as validation_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'customer_payment_methods')::text || ' Policies vorhanden' as details;

-- ============================================================================
-- 7. GESAMT-ÜBERSICHT: Alle Validierungen
-- ============================================================================
SELECT 
  '=== GESAMT-VALIDIERUNG ===' as summary,
  CASE 
    WHEN 
      -- appointments hat nur confirmation_token
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_name = 'appointments' 
       AND column_name IN ('automatic_payment_consent', 'automatic_payment_consent_at', 'scheduled_payment_date', 'payment_method_id', 'automatic_payment_processed', 'automatic_payment_processed_at')) = 0
      AND
      -- payments hat alle 6 Felder
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_name = 'payments' 
       AND column_name IN ('automatic_payment_consent', 'automatic_payment_consent_at', 'scheduled_payment_date', 'payment_method_id', 'automatic_payment_processed', 'automatic_payment_processed_at')) = 6
      AND
      -- customer_payment_methods existiert
      EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_payment_methods')
      AND
      -- RLS ist aktiv
      (SELECT rowsecurity FROM pg_tables WHERE tablename = 'customer_payment_methods') = true
    THEN '✅ ALLES KORREKT!'
    ELSE '❌ ES GIBT NOCH PROBLEME'
  END as final_status;

