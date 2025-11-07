-- Prüfung der Tabellenstruktur für automatische Zahlungen
-- Führt alle wichtigen Prüfungen durch

-- ============================================================================
-- 1. PRÜFE appointments Tabelle
-- ============================================================================
SELECT 
  'appointments' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name IN ('confirmation_token')
ORDER BY ordinal_position;

-- ============================================================================
-- 2. PRÜFE customer_payment_methods Tabelle
-- ============================================================================
SELECT 
  'customer_payment_methods' as table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customer_payment_methods'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. PRÜFE payments Tabelle (neue Spalten für automatische Zahlungen)
-- ============================================================================
SELECT 
  'payments' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
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
ORDER BY ordinal_position;

-- ============================================================================
-- 4. PRÜFE Foreign Keys
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
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
-- 5. PRÜFE Indizes
-- ============================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
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
-- 6. PRÜFE Unique Constraints
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name = 'customer_payment_methods'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 7. PRÜFE RLS (Row Level Security) Status
-- ============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'customer_payment_methods';

-- ============================================================================
-- 8. PRÜFE RLS Policies für customer_payment_methods
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'customer_payment_methods'
ORDER BY policyname;

-- ============================================================================
-- 9. ZÄHLE Datensätze in customer_payment_methods
-- ============================================================================
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  COUNT(DISTINCT wallee_token) as unique_tokens,
  COUNT(CASE WHEN is_default = true THEN 1 END) as default_methods,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_methods
FROM customer_payment_methods;

-- ============================================================================
-- 10. PRÜFE payments mit automatischen Zahlungsfeldern
-- ============================================================================
SELECT 
  COUNT(*) as total_payments,
  COUNT(CASE WHEN automatic_payment_consent = true THEN 1 END) as with_consent,
  COUNT(CASE WHEN scheduled_payment_date IS NOT NULL THEN 1 END) as scheduled,
  COUNT(CASE WHEN automatic_payment_processed = true THEN 1 END) as processed,
  COUNT(CASE WHEN payment_method_id IS NOT NULL THEN 1 END) as with_payment_method
FROM payments;

-- ============================================================================
-- 11. PRÜFE appointments mit confirmation_token
-- ============================================================================
SELECT 
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN confirmation_token IS NOT NULL THEN 1 END) as with_token,
  COUNT(DISTINCT confirmation_token) as unique_tokens
FROM appointments;

-- ============================================================================
-- 12. BEISPIEL: Zeige erste 5 Datensätze aus customer_payment_methods
-- ============================================================================
SELECT 
  id,
  user_id,
  tenant_id,
  LEFT(wallee_token, 20) || '...' as wallee_token_preview,
  wallee_customer_id,
  display_name,
  payment_method_type,
  is_default,
  is_active,
  created_at
FROM customer_payment_methods
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 13. BEISPIEL: Zeige payments mit automatischen Zahlungsfeldern
-- ============================================================================
SELECT 
  id,
  appointment_id,
  user_id,
  automatic_payment_consent,
  automatic_payment_consent_at,
  scheduled_payment_date,
  payment_method_id,
  automatic_payment_processed,
  automatic_payment_processed_at,
  payment_status,
  total_amount_rappen,
  created_at
FROM payments
WHERE automatic_payment_consent = true
   OR scheduled_payment_date IS NOT NULL
   OR payment_method_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 14. PRÜFE Kommentare (Documentation)
-- ============================================================================
SELECT
  t.table_name,
  c.column_name,
  pg_catalog.col_description(
    (SELECT oid FROM pg_class WHERE relname = t.table_name),
    c.ordinal_position
  ) as column_comment
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name IN ('appointments', 'payments', 'customer_payment_methods')
  AND c.column_name IN (
    'confirmation_token',
    'automatic_payment_consent',
    'automatic_payment_consent_at',
    'scheduled_payment_date',
    'payment_method_id',
    'automatic_payment_processed',
    'automatic_payment_processed_at',
    'wallee_token',
    'wallee_customer_id',
    'display_name'
  )
ORDER BY t.table_name, c.column_name;

