-- ============================================
-- Payment Reminders System
-- ============================================
-- Erweitert das Zahlungssystem um automatische Erinnerungen,
-- SMS-Benachrichtigungen und Auto-Löschung von unbestätigten Terminen

-- 1. Neue Tabelle für Erinnerungs-Tracking
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(10) NOT NULL CHECK (reminder_type IN ('email', 'sms')),
  reminder_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  metadata JSONB, -- Für zusätzliche Infos (z.B. Twilio Message SID)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_payment_reminder UNIQUE (payment_id, reminder_type, reminder_number)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_id ON payment_reminders(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_type ON payment_reminders(reminder_type);

-- RLS Policies
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Admins und Staff können alle Erinnerungen sehen
CREATE POLICY "Admins and staff can view all reminders"
  ON payment_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- Policy: System kann Erinnerungen erstellen (via Service Role)
CREATE POLICY "Service role can insert reminders"
  ON payment_reminders
  FOR INSERT
  WITH CHECK (true);

-- 2. Erweitere tenant_settings mit Erinnerungs-Konfiguration
-- Diese Settings werden als JSON in tenant_settings.setting_value gespeichert
-- Beispiel-Struktur:
-- {
--   "reminder_email_count": 3,
--   "reminder_email_interval_days": 2,
--   "reminder_sms_enabled": true,
--   "reminder_sms_after_emails": true,
--   "auto_delete_enabled": true,
--   "auto_delete_hours_after_auth_deadline": 72,
--   "notify_staff_on_auto_delete": true
-- }

-- Füge Standard-Einstellungen für bestehende Tenants hinzu
INSERT INTO tenant_settings (tenant_id, category, setting_key, setting_type, setting_value, created_at, updated_at)
SELECT 
  id as tenant_id,
  'payment' as category,
  'reminder_settings' as setting_key,
  'json' as setting_type,
  jsonb_build_object(
    'reminder_email_count', 3,
    'reminder_email_interval_days', 2,
    'reminder_sms_enabled', false,
    'reminder_sms_after_emails', true,
    'auto_delete_enabled', false,
    'auto_delete_hours_after_auth_deadline', 72,
    'notify_staff_on_auto_delete', true
  ) as setting_value,
  NOW() as created_at,
  NOW() as updated_at
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_settings
  WHERE tenant_settings.tenant_id = tenants.id
  AND tenant_settings.setting_key = 'reminder_settings'
);

-- 3. Füge neue Spalte zu payments hinzu für erste Erinnerung
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS first_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Kommentare
COMMENT ON TABLE payment_reminders IS 'Tracking aller gesendeten Zahlungs-Erinnerungen (E-Mail und SMS)';
COMMENT ON COLUMN payment_reminders.reminder_number IS 'Fortlaufende Nummer der Erinnerung (1 = erste E-Mail, 2 = zweite E-Mail, etc.)';
COMMENT ON COLUMN payment_reminders.metadata IS 'Zusätzliche Informationen wie Twilio Message SID, Resend Message ID, etc.';

COMMENT ON COLUMN payments.first_reminder_sent_at IS 'Zeitpunkt der ersten Erinnerungs-E-Mail';
COMMENT ON COLUMN payments.last_reminder_sent_at IS 'Zeitpunkt der letzten Erinnerung (E-Mail oder SMS)';
COMMENT ON COLUMN payments.reminder_count IS 'Anzahl der gesendeten Erinnerungen';

-- ============================================
-- Fertig! 
-- ============================================
-- Nächste Schritte:
-- 1. Admin UI für Erinnerungs-Einstellungen
-- 2. E-Mail-Template erstellen
-- 3. Cron Job erweitern
-- 4. SMS-Integration mit Twilio
-- 5. Auto-Löschung implementieren

