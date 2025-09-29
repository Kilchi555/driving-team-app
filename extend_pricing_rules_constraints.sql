-- Erweitere pricing_rules CHECK-Constraint für rule_type
-- Datum: 2024-12-19
-- Zweck: Erlaubt 'theory' und 'consultation' als neue rule_type Werte

-- 1. Zuerst den aktuellen Constraint-Namen finden und entfernen
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Finde den aktuellen CHECK-Constraint für rule_type
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pricing_rules'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%rule_type%';
    
    -- Entferne den alten Constraint falls vorhanden
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE pricing_rules DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Removed existing constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No existing rule_type constraint found';
    END IF;
END $$;

-- 2. Neuen erweiterten CHECK-Constraint hinzufügen
ALTER TABLE pricing_rules 
ADD CONSTRAINT pricing_rules_rule_type_check 
CHECK (rule_type IN ('base', 'pricing', 'base_price', 'admin_fee', 'theory', 'consultation'));

-- 3. Bestätigung
SELECT 
    '✅ CHECK-Constraint erweitert für pricing_rules.rule_type' as status,
    'Erlaubte Werte: base, pricing, base_price, admin_fee, theory, consultation' as allowed_values;

-- 4. Test: Zeige aktuelle Constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'pricing_rules'::regclass 
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%rule_type%';

