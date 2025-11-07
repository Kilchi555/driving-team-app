-- ============================================
-- Script zum Prüfen der Zahlungsmethoden-Speicherung
-- ============================================

-- 1. Übersicht: Alle gespeicherten Zahlungsmethoden
-- ============================================
SELECT 
  cpm.id,
  cpm.user_id,
  u.email as customer_email,
  u.first_name || ' ' || u.last_name as customer_name,
  cpm.wallee_token,
  LEFT(cpm.wallee_token, 20) || '...' as token_preview,
  cpm.wallee_customer_id,
  cpm.display_name,
  cpm.payment_method_type,
  cpm.is_default,
  cpm.is_active,
  cpm.created_at,
  cpm.metadata->>'transaction_id' as transaction_id,
  cpm.metadata->>'saved_at' as saved_at
FROM customer_payment_methods cpm
JOIN users u ON u.id = cpm.user_id
WHERE cpm.is_active = true
ORDER BY cpm.created_at DESC;

-- 2. Statistiken
-- ============================================
SELECT 
  COUNT(*) as total_payment_methods,
  COUNT(DISTINCT user_id) as unique_customers,
  COUNT(DISTINCT wallee_customer_id) as unique_wallee_customers,
  COUNT(CASE WHEN is_default = true THEN 1 END) as default_methods,
  MIN(created_at) as first_method_created,
  MAX(created_at) as last_method_created
FROM customer_payment_methods
WHERE is_active = true;

-- 3. Zahlungsmethoden pro Kunde
-- ============================================
SELECT 
  u.email,
  u.first_name || ' ' || u.last_name as customer_name,
  COUNT(cpm.id) as payment_methods_count,
  COUNT(CASE WHEN cpm.is_default = true THEN 1 END) as default_count,
  MAX(cpm.created_at) as last_method_added
FROM users u
LEFT JOIN customer_payment_methods cpm ON cpm.user_id = u.id AND cpm.is_active = true
WHERE u.role = 'client'
GROUP BY u.id, u.email, u.first_name, u.last_name
HAVING COUNT(cpm.id) > 0
ORDER BY payment_methods_count DESC, last_method_added DESC;

-- 4. Payments mit verknüpften Zahlungsmethoden
-- ============================================
SELECT 
  p.id as payment_id,
  p.wallee_transaction_id,
  p.payment_method,
  p.payment_method_id,
  CASE 
    WHEN cpm.id IS NOT NULL THEN '✅ Token vorhanden'
    ELSE '❌ Kein Token'
  END as token_status,
  cpm.wallee_token IS NOT NULL as has_token,
  LEFT(cpm.wallee_token, 20) || '...' as token_preview,
  cpm.wallee_customer_id,
  cpm.display_name,
  a.start_time as appointment_start,
  u.email as customer_email,
  p.created_at as payment_created
FROM payments p
LEFT JOIN customer_payment_methods cpm ON cpm.id = p.payment_method_id
LEFT JOIN appointments a ON a.id = p.appointment_id
LEFT JOIN users u ON u.id = p.user_id
WHERE p.payment_method = 'wallee'
  AND p.created_at > NOW() - INTERVAL '30 days'
ORDER BY p.created_at DESC
LIMIT 50;

-- 5. Kunden OHNE gespeicherte Zahlungsmethode
-- ============================================
SELECT 
  u.id,
  u.email,
  u.first_name || ' ' || u.last_name as customer_name,
  COUNT(p.id) as payment_count,
  MAX(p.created_at) as last_payment
FROM users u
JOIN payments p ON p.user_id = u.id AND p.payment_method = 'wallee'
LEFT JOIN customer_payment_methods cpm ON cpm.user_id = u.id AND cpm.is_active = true
WHERE u.role = 'client'
  AND cpm.id IS NULL
  AND p.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.first_name, u.last_name
HAVING COUNT(p.id) > 0
ORDER BY last_payment DESC;

-- 6. Duplikate finden (sollte keine geben)
-- ============================================
SELECT 
  user_id,
  wallee_token,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) as duplicate_ids,
  ARRAY_AGG(created_at ORDER BY created_at) as created_dates
FROM customer_payment_methods
WHERE is_active = true
  AND wallee_token IS NOT NULL
GROUP BY user_id, wallee_token
HAVING COUNT(*) > 1;

-- 7. Tokenization-Statistiken für automatische Zahlungen
-- ============================================
SELECT 
  COUNT(DISTINCT p.id) as total_wallee_payments,
  COUNT(DISTINCT p.user_id) as customers_with_wallee_payments,
  COUNT(DISTINCT cpm.user_id) as customers_with_saved_methods,
  COUNT(DISTINCT CASE WHEN p.payment_method_id IS NOT NULL THEN p.id END) as payments_using_saved_method,
  ROUND(
    (COUNT(DISTINCT CASE WHEN p.payment_method_id IS NOT NULL THEN p.id END)::numeric / 
     NULLIF(COUNT(DISTINCT p.id), 0)::numeric) * 100, 
    2
  ) as percentage_using_saved_methods
FROM payments p
LEFT JOIN customer_payment_methods cpm ON cpm.user_id = p.user_id AND cpm.is_active = true
WHERE p.payment_method = 'wallee'
  AND p.created_at > NOW() - INTERVAL '30 days';

-- 8. Fehlgeschlagene Token-Speicherungen (Prüfe Logs für diese Transactions)
-- ============================================
SELECT 
  p.id as payment_id,
  p.wallee_transaction_id,
  p.user_id,
  u.email,
  p.created_at,
  p.payment_method_id,
  CASE 
    WHEN cpm.id IS NULL AND p.created_at < NOW() - INTERVAL '1 hour' THEN '⚠️ Möglicher Fehler: Kein Token nach 1h'
    WHEN cpm.id IS NOT NULL THEN '✅ Token vorhanden'
    ELSE '⏳ Noch nicht verarbeitet (< 1h)'
  END as status
FROM payments p
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN customer_payment_methods cpm ON cpm.user_id = p.user_id AND cpm.is_active = true
WHERE p.payment_method = 'wallee'
  AND p.payment_status = 'completed'
  AND p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;

