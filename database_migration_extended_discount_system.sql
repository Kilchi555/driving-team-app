-- Migration: Erweitertes Rabatt-System für Staff-Rabatte und automatische Code-Rabatte
-- Erstellt: 2024-12-19
-- Zweck: Hybrides System für manuelle und automatische Rabatte

-- 1. Neue Spalten zur discounts Tabelle hinzufügen
ALTER TABLE discounts 
ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id),
ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS applied_by_staff_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_usage_count INTEGER DEFAULT 1;

-- 2. Neue Tabelle für Rabatt-Codes (Templates)
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Code-Details
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Rabatt-Konfiguration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage', 'free_lesson', 'free_product')),
  discount_value DECIMAL(10,2) NOT NULL, -- Prozent oder CHF-Betrag
  max_discount_rappen INTEGER, -- Maximaler Rabatt in Rappen
  
  -- Anwendungsregeln
  min_amount_rappen INTEGER DEFAULT 0, -- Mindestbetrag für Anwendung
  applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'appointments', 'products', 'specific_categories')),
  category_filter TEXT[], -- Spezifische Kategorien (z.B. ['A', 'B'])
  
  -- Automatisierung
  trigger_type VARCHAR(30) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'birthday', 'anniversary', 'first_lesson', 'milestone', 'seasonal')),
  trigger_conditions JSONB DEFAULT '{}', -- Z.B. {"birthday_month": 12, "min_lessons": 5}
  auto_apply BOOLEAN DEFAULT false, -- Automatisch bei nächster Fahrstunde anwenden
  
  -- Gültigkeit
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Nutzungslimits
  max_total_usage INTEGER DEFAULT -1, -- -1 = unbegrenzt
  max_per_user INTEGER DEFAULT 1,
  current_total_usage INTEGER DEFAULT 0,
  
  -- Erstellt von
  created_by_id UUID REFERENCES users(id),
  
  -- Metadaten
  metadata JSONB DEFAULT '{}'
);

-- 3. Kommentare für discount_codes
COMMENT ON TABLE discount_codes IS 'Rabatt-Code Templates für automatische und manuelle Rabatte';
COMMENT ON COLUMN discount_codes.code IS 'Eindeutiger Code für den Rabatt (z.B. BIRTHDAY2024)';
COMMENT ON COLUMN discount_codes.trigger_type IS 'Art des Triggers: manual, birthday, anniversary, etc.';
COMMENT ON COLUMN discount_codes.trigger_conditions IS 'JSON mit Bedingungen für automatische Anwendung';
COMMENT ON COLUMN discount_codes.auto_apply IS 'Ob der Rabatt automatisch bei der nächsten Fahrstunde angewendet wird';

-- 4. Indizes für discount_codes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_trigger_type ON discount_codes(trigger_type);
CREATE INDEX IF NOT EXISTS idx_discount_codes_validity ON discount_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

-- 5. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_codes_updated_at();

-- 6. Funktion für automatische Rabatt-Anwendung
CREATE OR REPLACE FUNCTION auto_apply_discounts_for_user(
  p_user_id UUID,
  p_appointment_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  discount_record RECORD;
  applied_discounts JSONB := '[]'::jsonb;
  user_birthday DATE;
  user_created_at TIMESTAMP WITH TIME ZONE;
  lesson_count INTEGER;
BEGIN
  -- Benutzer-Informationen holen
  SELECT birthdate, created_at INTO user_birthday, user_created_at
  FROM users WHERE id = p_user_id;
  
  -- Anzahl der Fahrstunden zählen
  SELECT COUNT(*) INTO lesson_count
  FROM appointments 
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Alle passenden automatischen Rabatte finden
  FOR discount_record IN 
    SELECT * FROM discount_codes 
    WHERE is_active = true 
    AND auto_apply = true
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND current_total_usage < max_total_usage OR max_total_usage = -1
  LOOP
    -- Prüfen ob der Benutzer den Rabatt bereits verwendet hat
    IF EXISTS (
      SELECT 1 FROM discounts 
      WHERE user_id = p_user_id 
      AND discount_code_id = discount_record.id
      AND usage_count >= discount_record.max_per_user
    ) THEN
      CONTINUE;
    END IF;
    
    -- Trigger-Bedingungen prüfen
    CASE discount_record.trigger_type
      WHEN 'birthday' THEN
        -- Geburtstags-Rabatt: Prüfen ob aktueller Monat = Geburtsmonat
        IF EXTRACT(MONTH FROM NOW()) = EXTRACT(MONTH FROM user_birthday) THEN
          -- Rabatt anwenden
          INSERT INTO discounts (
            appointment_id,
            user_id,
            discount_code_id,
            discount_type,
            discount_amount_rappen,
            discount_reason,
            original_amount_rappen,
            final_amount_rappen,
            is_automatic,
            applied_at
          ) VALUES (
            p_appointment_id,
            p_user_id,
            discount_record.id,
            discount_record.discount_type,
            CASE 
              WHEN discount_record.discount_type = 'percentage' THEN 0 -- Wird bei der Berechnung berechnet
              ELSE discount_record.discount_value * 100
            END,
            CONCAT('Geburtstags-Rabatt: ', discount_record.name),
            0, -- Wird bei der Preisberechnung gesetzt
            0, -- Wird bei der Preisberechnung gesetzt
            true,
            NOW()
          );
          
          -- Nutzungszähler erhöhen
          UPDATE discount_codes 
          SET current_total_usage = current_total_usage + 1
          WHERE id = discount_record.id;
          
          applied_discounts := applied_discounts || jsonb_build_object(
            'code', discount_record.code,
            'name', discount_record.name,
            'type', discount_record.discount_type,
            'value', discount_record.discount_value
          );
        END IF;
        
      WHEN 'first_lesson' THEN
        -- Rabatt für erste Fahrstunde
        IF lesson_count = 0 THEN
          -- Rabatt anwenden (ähnlich wie oben)
          INSERT INTO discounts (
            appointment_id,
            user_id,
            discount_code_id,
            discount_type,
            discount_amount_rappen,
            discount_reason,
            original_amount_rappen,
            final_amount_rappen,
            is_automatic,
            applied_at
          ) VALUES (
            p_appointment_id,
            p_user_id,
            discount_record.id,
            discount_record.discount_type,
            CASE 
              WHEN discount_record.discount_type = 'percentage' THEN 0
              ELSE discount_record.discount_value * 100
            END,
            CONCAT('Willkommens-Rabatt: ', discount_record.name),
            0,
            0,
            true,
            NOW()
          );
          
          UPDATE discount_codes 
          SET current_total_usage = current_total_usage + 1
          WHERE id = discount_record.id;
          
          applied_discounts := applied_discounts || jsonb_build_object(
            'code', discount_record.code,
            'name', discount_record.name,
            'type', discount_record.discount_type,
            'value', discount_record.discount_value
          );
        END IF;
        
      WHEN 'milestone' THEN
        -- Meilenstein-Rabatte (z.B. nach 10 Fahrstunden)
        IF discount_record.trigger_conditions->>'min_lessons' IS NOT NULL THEN
          IF lesson_count >= (discount_record.trigger_conditions->>'min_lessons')::integer THEN
            -- Rabatt anwenden
            INSERT INTO discounts (
              appointment_id,
              user_id,
              discount_code_id,
              discount_type,
              discount_amount_rappen,
              discount_reason,
              original_amount_rappen,
              final_amount_rappen,
              is_automatic,
              applied_at
            ) VALUES (
              p_appointment_id,
              p_user_id,
              discount_record.id,
              discount_record.discount_type,
              CASE 
                WHEN discount_record.discount_type = 'percentage' THEN 0
                ELSE discount_record.discount_value * 100
              END,
              CONCAT('Meilenstein-Rabatt: ', discount_record.name),
              0,
              0,
              true,
              NOW()
            );
            
            UPDATE discount_codes 
            SET current_total_usage = current_total_usage + 1
            WHERE id = discount_record.id;
            
            applied_discounts := applied_discounts || jsonb_build_object(
              'code', discount_record.code,
              'name', discount_record.name,
              'type', discount_record.discount_type,
              'value', discount_record.discount_value
            );
          END IF;
        END IF;
        
      WHEN 'seasonal' THEN
        -- Saisonale Rabatte (z.B. Sommer, Winter)
        IF discount_record.trigger_conditions->>'season' IS NOT NULL THEN
          -- Einfache Saison-Logik (kann erweitert werden)
          IF (
            (discount_record.trigger_conditions->>'season' = 'summer' AND EXTRACT(MONTH FROM NOW()) IN (6,7,8)) OR
            (discount_record.trigger_conditions->>'season' = 'winter' AND EXTRACT(MONTH FROM NOW()) IN (12,1,2))
          ) THEN
            -- Rabatt anwenden
            INSERT INTO discounts (
              appointment_id,
              user_id,
              discount_code_id,
              discount_type,
              discount_amount_rappen,
              discount_reason,
              original_amount_rappen,
              final_amount_rappen,
              is_automatic,
              applied_at
            ) VALUES (
              p_appointment_id,
              p_user_id,
              discount_record.id,
              discount_record.discount_type,
              CASE 
                WHEN discount_record.discount_type = 'percentage' THEN 0
                ELSE discount_record.discount_value * 100
              END,
              CONCAT('Saison-Rabatt: ', discount_record.name),
              0,
              0,
              true,
              NOW()
            );
            
            UPDATE discount_codes 
            SET current_total_usage = current_total_usage + 1
            WHERE id = discount_record.id;
            
            applied_discounts := applied_discounts || jsonb_build_object(
              'code', discount_record.code,
              'name', discount_record.name,
              'type', discount_record.discount_type,
              'value', discount_record.discount_value
            );
          END IF;
        END IF;
    END CASE;
  END LOOP;
  
  RETURN jsonb_build_object(
    'applied_discounts', applied_discounts,
    'count', jsonb_array_length(applied_discounts)
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Kommentar für die Funktion
COMMENT ON FUNCTION auto_apply_discounts_for_user IS 'Wendet automatisch alle passenden Rabatte für einen Benutzer an';

-- 8. Funktion für manuelle Rabatt-Eingabe durch Staff
CREATE OR REPLACE FUNCTION create_staff_discount(
  p_appointment_id UUID,
  p_user_id UUID,
  p_staff_id UUID,
  p_discount_type VARCHAR(20),
  p_discount_amount_rappen INTEGER,
  p_discount_reason TEXT,
  p_original_amount_rappen INTEGER,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_discount_id UUID;
BEGIN
  INSERT INTO discounts (
    appointment_id,
    user_id,
    staff_id,
    applied_by_staff_id,
    discount_type,
    discount_amount_rappen,
    discount_reason,
    original_amount_rappen,
    final_amount_rappen,
    is_automatic,
    expires_at,
    applied_at
  ) VALUES (
    p_appointment_id,
    p_user_id,
    p_staff_id,
    p_staff_id,
    p_discount_type,
    p_discount_amount_rappen,
    p_discount_reason,
    p_original_amount_rappen,
    p_original_amount_rappen - p_discount_amount_rappen,
    false,
    p_expires_at,
    NOW()
  ) RETURNING id INTO new_discount_id;
  
  RETURN new_discount_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Kommentar für die Funktion
COMMENT ON FUNCTION create_staff_discount IS 'Erstellt einen manuellen Rabatt durch Staff-Mitglied';

-- 10. View für aktive Rabatte eines Benutzers
CREATE OR REPLACE VIEW v_user_active_discounts AS
SELECT 
  d.id,
  d.user_id,
  u.first_name,
  u.last_name,
  d.discount_type,
  d.discount_amount_rappen,
  d.discount_reason,
  d.is_automatic,
  d.applied_at,
  d.expires_at,
  d.appointment_id,
  d.payment_id,
  d.product_sale_id,
  CASE 
    WHEN d.discount_code_id IS NOT NULL THEN dc.code
    ELSE 'Manuell'
  END as discount_source,
  CASE 
    WHEN d.applied_by_staff_id IS NOT NULL THEN CONCAT(s.first_name, ' ', s.last_name)
    ELSE 'Automatisch'
  END as applied_by
FROM discounts d
JOIN users u ON d.user_id = u.id
LEFT JOIN discount_codes dc ON d.discount_code_id = dc.id
LEFT JOIN users s ON d.applied_by_staff_id = s.id
WHERE d.is_active = true
AND (d.expires_at IS NULL OR d.expires_at > NOW())
ORDER BY d.applied_at DESC;

-- 11. Kommentar für die View
COMMENT ON VIEW v_user_active_discounts IS 'Übersicht aller aktiven Rabatte eines Benutzers';

-- 12. Beispieldaten für Rabatt-Codes
INSERT INTO discount_codes (
  code, name, description, discount_type, discount_value, 
  trigger_type, auto_apply, trigger_conditions, 
  valid_from, valid_until, max_total_usage, max_per_user
) VALUES 
-- Geburtstags-Rabatt
('BIRTHDAY2024', 'Geburtstags-Rabatt', '10% Rabatt im Geburtsmonat', 'percentage', 10.00,
 'birthday', true, '{"birthday_month": null}', 
 '2024-01-01', '2024-12-31', -1, 1),

-- Willkommens-Rabatt
('WELCOME2024', 'Willkommens-Rabatt', 'CHF 20 Rabatt für erste Fahrstunde', 'fixed', 20.00,
 'first_lesson', true, '{"min_lessons": 0}', 
 '2024-01-01', '2024-12-31', 100, 1),

-- Meilenstein-Rabatt
('MILESTONE10', '10. Fahrstunde', 'CHF 15 Rabatt nach 10 Fahrstunden', 'fixed', 15.00,
 'milestone', true, '{"min_lessons": 10}', 
 '2024-01-01', '2024-12-31', -1, 1),

-- Sommer-Rabatt
('SUMMER2024', 'Sommer-Rabatt', '5% Rabatt im Sommer', 'percentage', 5.00,
 'seasonal', true, '{"season": "summer"}', 
 '2024-06-01', '2024-08-31', -1, 1)
ON CONFLICT (code) DO NOTHING;
