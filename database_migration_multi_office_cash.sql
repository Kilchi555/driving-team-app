-- Multi-Office Cash Register System
-- Erweitert das bestehende System um Bürokassen mit Staff-Zuweisungen

-- 1. Neue Tabelle für Kassenstellen (Office Cash Registers)
CREATE TABLE IF NOT EXISTS office_cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  
  -- Kassen-Details
  name VARCHAR(100) NOT NULL, -- "Hauptkasse", "Empfang", "Prüfungskasse"
  description TEXT,
  location VARCHAR(100), -- "Büro", "Empfang", "Standort Nord"
  register_type VARCHAR(50) DEFAULT 'office' CHECK (register_type IN ('office', 'reception', 'exam', 'emergency')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_main_register BOOLEAN DEFAULT FALSE, -- Eine Hauptkasse pro Tenant
  
  -- Verwaltung
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff-Zuweisungen zu Bürokassen
CREATE TABLE IF NOT EXISTS office_cash_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID REFERENCES office_cash_registers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Berechtigung
  access_level VARCHAR(20) DEFAULT 'operator' CHECK (access_level IN ('manager', 'operator', 'viewer')),
  -- manager: Vollzugriff, operator: Transaktionen, viewer: nur lesen
  
  -- Zeitbeschränkungen (optional)
  time_restrictions JSONB, -- {"days": ["mon","tue"], "hours": {"start": "08:00", "end": "18:00"}}
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  assigned_by UUID REFERENCES users(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: Ein Staff kann nur einmal pro Kasse zugewiesen werden
  UNIQUE(cash_register_id, staff_id)
);

-- 3. Erweitere cash_balances um office_cash_register_id
ALTER TABLE cash_balances 
ADD COLUMN IF NOT EXISTS office_cash_register_id UUID REFERENCES office_cash_registers(id),
ADD COLUMN IF NOT EXISTS register_type VARCHAR(20) DEFAULT 'instructor' CHECK (register_type IN ('instructor', 'office'));

-- 4. Erweitere cash_movements um office_cash_register_id  
ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS office_cash_register_id UUID REFERENCES office_cash_registers(id),
ADD COLUMN IF NOT EXISTS register_type VARCHAR(20) DEFAULT 'instructor' CHECK (register_type IN ('instructor', 'office'));

-- 5. Erweitere cash_transactions um office_cash_register_id (für Büro-Transaktionen)
ALTER TABLE cash_transactions 
ADD COLUMN IF NOT EXISTS office_cash_register_id UUID REFERENCES office_cash_registers(id),
ADD COLUMN IF NOT EXISTS transaction_source VARCHAR(20) DEFAULT 'instructor' CHECK (transaction_source IN ('instructor', 'office'));

-- 6. Erstelle Hauptkasse für jeden bestehenden Tenant
DO $$
DECLARE
    tenant_record RECORD;
    main_register_id UUID;
    admin_user_id UUID;
BEGIN
    FOR tenant_record IN 
        SELECT id, name FROM tenants WHERE is_active = TRUE
    LOOP
        -- Finde den ersten Admin für diesen Tenant
        SELECT id INTO admin_user_id
        FROM users 
        WHERE tenant_id = tenant_record.id 
          AND role IN ('admin', 'tenant_admin')
          AND is_active = TRUE
        ORDER BY created_at ASC 
        LIMIT 1;
        
        IF admin_user_id IS NOT NULL THEN
            -- Erstelle Hauptkasse
            INSERT INTO office_cash_registers (
                tenant_id,
                name,
                description,
                location,
                register_type,
                is_main_register,
                created_by
            ) VALUES (
                tenant_record.id,
                'Hauptkasse',
                'Zentrale Bürokasse für ' || tenant_record.name,
                'Büro',
                'office',
                TRUE,
                admin_user_id
            ) RETURNING id INTO main_register_id;
            
            -- Weise den Admin als Manager der Hauptkasse zu
            INSERT INTO office_cash_staff_assignments (
                cash_register_id,
                staff_id,
                access_level,
                assigned_by
            ) VALUES (
                main_register_id,
                admin_user_id,
                'manager',
                admin_user_id
            );
            
            RAISE NOTICE 'Hauptkasse erstellt für Tenant: % (ID: %)', tenant_record.name, main_register_id;
        END IF;
    END LOOP;
END $$;

-- 7. Funktionen für Bürokassen-Verwaltung

-- Funktion: Neue Bürokasse erstellen
CREATE OR REPLACE FUNCTION create_office_cash_register(
    p_tenant_id UUID,
    p_name VARCHAR(100),
    p_description TEXT,
    p_location VARCHAR(100),
    p_register_type VARCHAR(50),
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
BEGIN
    -- Prüfe Berechtigung (nur Admins)
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_created_by 
          AND role IN ('admin', 'tenant_admin')
          AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'Nur Admins können Bürokassen erstellen';
    END IF;
    
    -- Erstelle Kasse
    INSERT INTO office_cash_registers (
        tenant_id, name, description, location, register_type, created_by
    ) VALUES (
        p_tenant_id, p_name, p_description, p_location, p_register_type, p_created_by
    ) RETURNING id INTO v_register_id;
    
    -- Erstelle initialen Kassenstand
    INSERT INTO cash_balances (
        office_cash_register_id,
        instructor_id,
        register_type,
        current_balance_rappen
    ) VALUES (
        v_register_id,
        p_created_by, -- Admin ist initial verantwortlich
        'office',
        0
    );
    
    -- Weise Ersteller als Manager zu
    INSERT INTO office_cash_staff_assignments (
        cash_register_id, staff_id, access_level, assigned_by
    ) VALUES (
        v_register_id, p_created_by, 'manager', p_created_by
    );
    
    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Staff zu Bürokasse zuweisen
CREATE OR REPLACE FUNCTION assign_staff_to_office_cash(
    p_cash_register_id UUID,
    p_staff_id UUID,
    p_access_level VARCHAR(20),
    p_assigned_by UUID,
    p_time_restrictions JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_register_tenant UUID;
    v_staff_tenant UUID;
BEGIN
    -- Prüfe ob Zuweiser berechtigt ist
    SELECT tenant_id INTO v_register_tenant 
    FROM office_cash_registers 
    WHERE id = p_cash_register_id;
    
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_assigned_by 
          AND role IN ('admin', 'tenant_admin')
          AND tenant_id = v_register_tenant
    ) THEN
        RAISE EXCEPTION 'Nur Admins können Staff zu Kassen zuweisen';
    END IF;
    
    -- Prüfe ob Staff zum gleichen Tenant gehört
    SELECT tenant_id INTO v_staff_tenant 
    FROM users 
    WHERE id = p_staff_id;
    
    IF v_register_tenant != v_staff_tenant THEN
        RAISE EXCEPTION 'Staff muss zum gleichen Tenant gehören wie die Kasse';
    END IF;
    
    -- Erstelle oder aktualisiere Zuweisung
    INSERT INTO office_cash_staff_assignments (
        cash_register_id, staff_id, access_level, assigned_by, time_restrictions
    ) VALUES (
        p_cash_register_id, p_staff_id, p_access_level, p_assigned_by, p_time_restrictions
    )
    ON CONFLICT (cash_register_id, staff_id) 
    DO UPDATE SET 
        access_level = EXCLUDED.access_level,
        time_restrictions = EXCLUDED.time_restrictions,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. View für einfache Kassen-Übersicht
CREATE OR REPLACE VIEW office_cash_overview AS
SELECT 
    ocr.id as register_id,
    ocr.name as register_name,
    ocr.description,
    ocr.location,
    ocr.register_type,
    ocr.is_main_register,
    ocr.tenant_id,
    
    -- Aktueller Kassenstand
    COALESCE(cb.current_balance_rappen, 0) as current_balance_rappen,
    
    -- Zugewiesene Staff
    array_agg(
        CASE WHEN ocsa.staff_id IS NOT NULL THEN
            json_build_object(
                'staff_id', ocsa.staff_id,
                'staff_name', u.first_name || ' ' || u.last_name,
                'access_level', ocsa.access_level,
                'is_active', ocsa.is_active
            )
        END
    ) FILTER (WHERE ocsa.staff_id IS NOT NULL) as assigned_staff,
    
    -- Letzte Aktivität
    MAX(cm.created_at) as last_activity
    
FROM office_cash_registers ocr
LEFT JOIN cash_balances cb ON ocr.id = cb.office_cash_register_id
LEFT JOIN office_cash_staff_assignments ocsa ON ocr.id = ocsa.cash_register_id
LEFT JOIN users u ON ocsa.staff_id = u.id
LEFT JOIN cash_movements cm ON ocr.id = cm.office_cash_register_id
WHERE ocr.is_active = TRUE
GROUP BY ocr.id, ocr.name, ocr.description, ocr.location, ocr.register_type, 
         ocr.is_main_register, ocr.tenant_id, cb.current_balance_rappen;

-- 9. RLS Policies für neue Tabellen
ALTER TABLE office_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_cash_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Nur Tenant-Mitglieder sehen ihre Kassen
CREATE POLICY "office_cash_registers_tenant_access" ON office_cash_registers
    FOR ALL TO authenticated
    USING (
        tenant_id = (
            SELECT u.tenant_id FROM users u 
            WHERE u.auth_user_id = auth.uid() AND u.is_active = TRUE
        )
    );

-- Policy: Staff-Zuweisungen nur für berechtigte Benutzer
CREATE POLICY "office_cash_assignments_access" ON office_cash_staff_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM office_cash_registers ocr
            JOIN users u ON u.tenant_id = ocr.tenant_id
            WHERE ocr.id = cash_register_id
              AND u.auth_user_id = auth.uid()
              AND u.is_active = TRUE
        )
    );

-- 10. Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_office_cash_registers_tenant ON office_cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_office_cash_assignments_register ON office_cash_staff_assignments(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_office_cash_assignments_staff ON office_cash_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_cash_balances_office_register ON cash_balances(office_cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_office_register ON cash_movements(office_cash_register_id);

-- 11. Summary
DO $$
DECLARE
    created_registers INTEGER;
    total_tenants INTEGER;
BEGIN
    SELECT COUNT(*) INTO created_registers FROM office_cash_registers WHERE is_main_register = TRUE;
    SELECT COUNT(*) INTO total_tenants FROM tenants WHERE is_active = TRUE;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MULTI-OFFICE CASH SYSTEM CREATED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '• Multiple office cash registers per tenant';
    RAISE NOTICE '• Staff assignments with access levels (manager/operator/viewer)';
    RAISE NOTICE '• Time-based access restrictions';
    RAISE NOTICE '• Main register + additional registers';
    RAISE NOTICE '• Full audit trail integration';
    RAISE NOTICE '';
    RAISE NOTICE 'Created main registers: % / % tenants', created_registers, total_tenants;
    RAISE NOTICE '';
    RAISE NOTICE 'Access Levels:';
    RAISE NOTICE '• manager: Full access (deposits, withdrawals, assignments)';
    RAISE NOTICE '• operator: Transactions only (deposits, withdrawals)';
    RAISE NOTICE '• viewer: Read-only access';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '• SELECT create_office_cash_register(tenant_id, name, desc, location, type, admin_id);';
    RAISE NOTICE '• SELECT assign_staff_to_office_cash(register_id, staff_id, level, admin_id);';
    RAISE NOTICE '• SELECT * FROM office_cash_overview WHERE tenant_id = ''your-tenant-id'';';
END $$;
