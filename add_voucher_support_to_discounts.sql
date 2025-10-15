-- Migration: Gutschein-Support zur discounts Tabelle hinzufügen
-- Erstellt: 2024-12-19
-- Zweck: Erweitert bestehende discounts Tabelle um Gutschein-Funktionalität

-- 1. Neue Spalten für Gutscheine hinzufügen
ALTER TABLE discounts 
ADD COLUMN IF NOT EXISTS is_voucher BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voucher_recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS voucher_recipient_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS voucher_buyer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS voucher_buyer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS redeemed_for UUID REFERENCES appointments(id),
ADD COLUMN IF NOT EXISTS remaining_amount_rappen INTEGER;

-- 2. Kommentare für Dokumentation hinzufügen
COMMENT ON COLUMN discounts.is_voucher IS 'Kennzeichnet ob es sich um einen Gutschein handelt';
COMMENT ON COLUMN discounts.voucher_recipient_name IS 'Name des Gutschein-Empfängers';
COMMENT ON COLUMN discounts.voucher_recipient_email IS 'E-Mail des Gutschein-Empfängers';
COMMENT ON COLUMN discounts.voucher_buyer_name IS 'Name des Gutschein-Käufers';
COMMENT ON COLUMN discounts.voucher_buyer_email IS 'E-Mail des Gutschein-Käufers';
COMMENT ON COLUMN discounts.payment_id IS 'Referenz auf die Zahlung die den Gutschein erstellt hat';
COMMENT ON COLUMN discounts.redeemed_at IS 'Zeitpunkt der Gutschein-Einlösung';
COMMENT ON COLUMN discounts.redeemed_by IS 'User der den Gutschein eingelöst hat';
COMMENT ON COLUMN discounts.redeemed_for IS 'Termin für den der Gutschein eingelöst wurde';
COMMENT ON COLUMN discounts.remaining_amount_rappen IS 'Verbleibender Betrag nach Teil-Einlösung';

-- 3. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_discounts_is_voucher ON discounts(is_voucher);
CREATE INDEX IF NOT EXISTS idx_discounts_code_voucher ON discounts(code) WHERE is_voucher = true;
CREATE INDEX IF NOT EXISTS idx_discounts_payment_id ON discounts(payment_id);
CREATE INDEX IF NOT EXISTS idx_discounts_redeemed_by ON discounts(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_discounts_redeemed_for ON discounts(redeemed_for);

-- 4. RLS Policies für Gutscheine
-- Zuerst bestehende Policies löschen falls sie existieren
DROP POLICY IF EXISTS "Users can view their own vouchers" ON discounts;
DROP POLICY IF EXISTS "Staff can manage all vouchers" ON discounts;
DROP POLICY IF EXISTS "Staff can redeem vouchers" ON discounts;

-- Policy für Gutschein-Käufer: Können ihre eigenen Gutscheine sehen
CREATE POLICY "Users can view their own vouchers" ON discounts
    FOR SELECT USING (
        is_voucher = true AND (
            voucher_buyer_email = auth.jwt() ->> 'email' OR
            voucher_recipient_email = auth.jwt() ->> 'email'
        )
    );

-- Policy für Staff: Können alle Gutscheine verwalten
CREATE POLICY "Staff can manage all vouchers" ON discounts
    FOR ALL USING (
        is_voucher = true AND (
            staff_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND u.role IN ('admin', 'staff')
            )
        )
    );

-- Policy für Gutschein-Einlösung
CREATE POLICY "Staff can redeem vouchers" ON discounts
    FOR UPDATE USING (
        is_voucher = true AND (
            staff_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = auth.uid() 
                AND u.role IN ('admin', 'staff')
            )
        )
    );

-- 5. Trigger für automatische Code-Generierung
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code VARCHAR(12);
    code_exists BOOLEAN;
BEGIN
    -- Nur für neue Gutscheine ohne Code
    IF NEW.is_voucher = true AND (NEW.code IS NULL OR NEW.code = '') THEN
        LOOP
            -- Generiere Code im Format: GC-ABC123-XYZ
            new_code := 'GC-' || 
                       upper(substring(md5(random()::text) from 1 for 6)) || '-' ||
                       upper(substring(md5(random()::text) from 1 for 3));
            
            -- Prüfe ob Code bereits existiert
            SELECT EXISTS(SELECT 1 FROM discounts WHERE code = new_code) INTO code_exists;
            
            -- Wenn Code einzigartig ist, verwende ihn
            IF NOT code_exists THEN
                NEW.code := new_code;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_generate_voucher_code ON discounts;
CREATE TRIGGER trigger_generate_voucher_code
    BEFORE INSERT ON discounts
    FOR EACH ROW
    EXECUTE FUNCTION generate_voucher_code();

-- 6. View für einfache Gutschein-Abfragen
CREATE OR REPLACE VIEW vouchers AS
SELECT 
    d.id,
    d.code,
    d.name,
    NULL as description, -- description Spalte existiert nicht in discounts Tabelle
    d.discount_value as amount_chf,
    d.max_discount_rappen as amount_rappen,
    d.remaining_amount_rappen,
    d.voucher_recipient_name,
    d.voucher_recipient_email,
    d.voucher_buyer_name,
    d.voucher_buyer_email,
    d.payment_id,
    d.valid_until,
    d.redeemed_at,
    d.redeemed_by,
    d.redeemed_for,
    d.usage_count,
    d.is_active,
    CASE 
        WHEN d.usage_count >= d.usage_limit THEN 'redeemed'
        WHEN d.valid_until < NOW() THEN 'expired'
        WHEN d.is_active = false THEN 'cancelled'
        ELSE 'active'
    END as status,
    d.created_at,
    d.updated_at
FROM discounts d
WHERE d.is_voucher = true;

-- 7. Funktion für Gutschein-Einlösung
CREATE OR REPLACE FUNCTION redeem_voucher(
    voucher_code VARCHAR(50),
    appointment_id UUID,
    redeemer_id UUID
)
RETURNS JSON AS $$
DECLARE
    voucher_record RECORD;
    result JSON;
BEGIN
    -- Gutschein finden
    SELECT * INTO voucher_record
    FROM discounts 
    WHERE code = voucher_code 
    AND is_voucher = true 
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
    AND usage_count < usage_limit;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Gutschein nicht gefunden oder ungültig'
        );
    END IF;
    
    -- Gutschein als eingelöst markieren
    UPDATE discounts 
    SET 
        usage_count = usage_count + 1,
        redeemed_at = NOW(),
        redeemed_by = redeemer_id,
        redeemed_for = appointment_id,
        is_active = false,
        remaining_amount_rappen = 0
    WHERE id = voucher_record.id;
    
    RETURN json_build_object(
        'success', true,
        'voucher_id', voucher_record.id,
        'amount_rappen', voucher_record.max_discount_rappen,
        'message', 'Gutschein erfolgreich eingelöst'
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Beispiel-Daten für Tests (optional)
-- INSERT INTO discounts (
--     name, 
--     discount_type, 
--     discount_value, 
--     max_discount_rappen,
--     is_voucher, 
--     voucher_recipient_name,
--     voucher_recipient_email,
--     usage_limit,
--     is_active,
--     applies_to,
--     valid_until
-- ) VALUES (
--     'Test-Gutschein',
--     'fixed',
--     50.00,
--     5000,
--     true,
--     'Max Mustermann',
--     'max@example.com',
--     1,
--     true,
--     'appointments',
--     NOW() + INTERVAL '2 years'
-- );

COMMIT;
