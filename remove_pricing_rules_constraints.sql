-- Entferne CHECK-Constraints von pricing_rules für maximale Flexibilität
-- Datum: 2024-12-19
-- Zweck: Ermöglicht Tenants eigene rule_type Werte zu definieren (Multi-Tenant/Multi-Branche ready)

-- 1. Alle CHECK-Constraints für rule_type entfernen
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Finde alle CHECK-Constraints für rule_type
    FOR constraint_record IN 
        SELECT con.conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'pricing_rules'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%rule_type%'
    LOOP
        EXECUTE format('ALTER TABLE pricing_rules DROP CONSTRAINT %I', constraint_record.conname);
        RAISE NOTICE '🗑️ Removed constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- 2. Bestätigung - Zeige dass keine rule_type Constraints mehr existieren
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Keine rule_type CHECK-Constraints mehr vorhanden'
        ELSE '⚠️ Es existieren noch ' || COUNT(*) || ' rule_type Constraints'
    END as status
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'pricing_rules'
  AND con.contype = 'c'
  AND pg_get_constraintdef(con.oid) LIKE '%rule_type%';

-- 3. Zeige alle verbleibenden Constraints (zur Sicherheit)
SELECT 
    '📋 Verbleibende Constraints auf pricing_rules:' as info,
    conname as constraint_name,
    CASE contype 
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        ELSE contype::text
    END as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'pricing_rules'::regclass
ORDER BY contype, conname;

