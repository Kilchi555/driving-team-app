-- QUICK CHECK: Schnelle Prüfung aller wichtigen Strukturen
-- Führt alle Prüfungen in einem Durchgang durch

-- ============================================================================
-- ZUSAMMENFASSUNG: Alle relevanten Spalten in einer Übersicht
-- ============================================================================
SELECT 
  'appointments' as table_name,
  array_agg(column_name ORDER BY column_name) as relevant_columns
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name = 'confirmation_token'

UNION ALL

SELECT 
  'customer_payment_methods' as table_name,
  array_agg(column_name ORDER BY column_name) as relevant_columns
FROM information_schema.columns
WHERE table_name = 'customer_payment_methods'
  AND column_name IN (
    'id', 'user_id', 'tenant_id', 'wallee_token', 'wallee_customer_id',
    'display_name', 'payment_method_type', 'is_default', 'expires_at',
    'metadata', 'is_active', 'created_at', 'updated_at'
  )

UNION ALL

SELECT 
  'payments' as table_name,
  array_agg(column_name ORDER BY column_name) as relevant_columns
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'automatic_payment_consent', 'automatic_payment_consent_at',
    'scheduled_payment_date', 'payment_method_id',
    'automatic_payment_processed', 'automatic_payment_processed_at'
  );

-- ============================================================================
-- CHECK: Fehlende Spalten erkennen
-- ============================================================================
WITH expected_columns AS (
  SELECT 'appointments' as table_name, 'confirmation_token' as column_name
  UNION ALL SELECT 'customer_payment_methods', 'wallee_token'
  UNION ALL SELECT 'customer_payment_methods', 'wallee_customer_id'
  UNION ALL SELECT 'customer_payment_methods', 'display_name'
  UNION ALL SELECT 'payments', 'automatic_payment_consent'
  UNION ALL SELECT 'payments', 'scheduled_payment_date'
  UNION ALL SELECT 'payments', 'payment_method_id'
  UNION ALL SELECT 'payments', 'automatic_payment_processed'
),
actual_columns AS (
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_name IN ('appointments', 'payments', 'customer_payment_methods')
)
SELECT 
  ec.table_name,
  ec.column_name,
  CASE WHEN ac.column_name IS NULL THEN '❌ FEHLT' ELSE '✅ Vorhanden' END as status
FROM expected_columns ec
LEFT JOIN actual_columns ac 
  ON ec.table_name = ac.table_name 
  AND ec.column_name = ac.column_name
ORDER BY ec.table_name, ec.column_name;

-- ============================================================================
-- CHECK: Foreign Key Integrity
-- ============================================================================
SELECT
  'Foreign Key Check' as check_type,
  tc.table_name || '.' || kcu.column_name as from_column,
  ccu.table_name || '.' || ccu.column_name as to_column,
  '✅ OK' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (
    (tc.table_name = 'customer_payment_methods' AND kcu.column_name IN ('user_id', 'tenant_id'))
    OR (tc.table_name = 'payments' AND kcu.column_name = 'payment_method_id')
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- CHECK: Indizes vorhanden?
-- ============================================================================
SELECT
  tablename,
  indexname,
  '✅ Index vorhanden' as status
FROM pg_indexes
WHERE tablename IN ('appointments', 'payments', 'customer_payment_methods')
  AND (
    indexname LIKE '%confirmation_token%'
    OR indexname LIKE '%payment_method%'
    OR indexname LIKE '%scheduled_payment%'
    OR indexname LIKE '%wallee_customer%'
    OR indexname LIKE '%automatic_payment%'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- CHECK: RLS aktiv?
-- ============================================================================
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS aktiv' ELSE '❌ RLS inaktiv' END as rls_status
FROM pg_tables
WHERE tablename = 'customer_payment_methods';

-- ============================================================================
-- CHECK: RLS Policies vorhanden?
-- ============================================================================
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE WHEN COUNT(*) >= 5 THEN '✅ Ausreichend Policies' ELSE '⚠️ Policies fehlen' END as status
FROM pg_policies
WHERE tablename = 'customer_payment_methods'
GROUP BY tablename;

