-- Komplette Theory & Consultation Pricing Setup
-- Datum: 2024-12-19
-- Zweck: 1) Erweitert CHECK-Constraint, 2) Erstellt Pricing Rules für alle Tenants

-- SCHRITT 1: Erweitere pricing_rules CHECK-Constraint für rule_type
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

-- Neuen erweiterten CHECK-Constraint hinzufügen
ALTER TABLE pricing_rules 
ADD CONSTRAINT pricing_rules_rule_type_check 
CHECK (rule_type IN ('base', 'pricing', 'base_price', 'admin_fee', 'theory', 'consultation'));

RAISE NOTICE '✅ CHECK-Constraint erweitert für pricing_rules.rule_type';

-- SCHRITT 2: Erstelle Pricing Rules für alle Tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Für jeden aktiven Tenant (inkl. Standard-Templates mit tenant_id = NULL)
    FOR tenant_record IN 
        SELECT id, name, slug FROM tenants WHERE is_active = true
        UNION 
        SELECT NULL as id, 'Standard Templates' as name, 'global' as slug
    LOOP
        RAISE NOTICE 'Creating pricing rules for tenant: % (ID: %)', tenant_record.name, tenant_record.id;
        
        -- Lösche existierende Regeln für diesen Tenant und Typ
        DELETE FROM pricing_rules 
        WHERE (tenant_id = tenant_record.id OR (tenant_id IS NULL AND tenant_record.id IS NULL))
          AND rule_type IN ('theory', 'consultation');
        
        -- Theorie-Preisregeln für alle Fahrkategorien erstellen
        INSERT INTO pricing_rules (
          id,
          tenant_id,
          rule_type,
          category_code,
          rule_name,
          price_per_minute_rappen,
          admin_fee_rappen,
          admin_fee_applies_from,
          base_duration_minutes,
          is_active,
          valid_from,
          valid_until,
          created_at,
          updated_at
        ) VALUES 
        -- Auto (B) - Theorie
        (gen_random_uuid(), tenant_record.id, 'theory', 'B', 'Theorielektion Auto (B)', 8500, 0, 999, 45, true, NOW(), NULL, NOW(), NOW()),
        
        -- Motorrad (A) - Theorie  
        (gen_random_uuid(), tenant_record.id, 'theory', 'A', 'Theorielektion Motorrad (A)', 8500, 0, 999, 45, true, NOW(), NULL, NOW(), NOW()),
        
        -- Auto + Anhänger (BE) - Theorie
        (gen_random_uuid(), tenant_record.id, 'theory', 'BE', 'Theorielektion Auto + Anhänger (BE)', 9000, 0, 999, 45, true, NOW(), NULL, NOW(), NOW()),
        
        -- LKW (C) - Theorie
        (gen_random_uuid(), tenant_record.id, 'theory', 'C', 'Theorielektion LKW (C)', 12000, 0, 999, 45, true, NOW(), NULL, NOW(), NOW()),
        
        -- LKW + Anhänger (CE) - Theorie
        (gen_random_uuid(), tenant_record.id, 'theory', 'CE', 'Theorielektion LKW + Anhänger (CE)', 13000, 0, 999, 45, true, NOW(), NULL, NOW(), NOW()),
        
        -- Bus (D) - Theorie
        (gen_random_uuid(), tenant_record.id, 'theory', 'D', 'Theorielektion Bus (D)', 12000, 0, 999, 45, true, NOW(), NULL, NOW(), NOW()),
        
        -- Berufspersonentransport (BPT) - Theorie
        (gen_random_uuid(), tenant_record.id, 'theory', 'BPT', 'Theorielektion Berufspersonentransport (BPT)', 9500, 0, 999, 45, true, NOW(), NULL, NOW(), NOW());

        -- Beratungs-Preisregeln für alle Kategorien erstellen
        INSERT INTO pricing_rules (
          id,
          tenant_id,
          rule_type,
          category_code,
          rule_name,
          price_per_minute_rappen,
          admin_fee_rappen,
          admin_fee_applies_from,
          base_duration_minutes,
          is_active,
          valid_from,
          valid_until,
          created_at,
          updated_at
        ) VALUES 
        -- Beratung für alle Kategorien (einheitlicher Preis)
        (gen_random_uuid(), tenant_record.id, 'consultation', 'B', 'Beratung Auto (B)', 12000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW()),
        (gen_random_uuid(), tenant_record.id, 'consultation', 'A', 'Beratung Motorrad (A)', 12000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW()),
        (gen_random_uuid(), tenant_record.id, 'consultation', 'BE', 'Beratung Auto + Anhänger (BE)', 12000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW()),
        (gen_random_uuid(), tenant_record.id, 'consultation', 'C', 'Beratung LKW (C)', 15000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW()),
        (gen_random_uuid(), tenant_record.id, 'consultation', 'CE', 'Beratung LKW + Anhänger (CE)', 15000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW()),
        (gen_random_uuid(), tenant_record.id, 'consultation', 'D', 'Beratung Bus (D)', 15000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW()),
        (gen_random_uuid(), tenant_record.id, 'consultation', 'BPT', 'Beratung Berufspersonentransport (BPT)', 12000, 0, 999, 60, true, NOW(), NULL, NOW(), NOW());
          
    END LOOP;
END $$;

-- SCHRITT 3: Bestätigung der Einfügung
SELECT 
  '✅ Service-spezifische Pricing Rules erstellt:' as status,
  COALESCE(t.name, 'Standard Templates') as tenant_name,
  pr.rule_type,
  pr.category_code,
  pr.rule_name,
  (pr.price_per_minute_rappen * pr.base_duration_minutes / 100.0) as total_price_chf,
  pr.base_duration_minutes,
  pr.is_active
FROM pricing_rules pr
LEFT JOIN tenants t ON pr.tenant_id = t.id
WHERE pr.rule_type IN ('theory', 'consultation')
ORDER BY COALESCE(t.name, 'Standard Templates'), pr.rule_type, pr.category_code;

