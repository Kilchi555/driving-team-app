-- Mahnwesen (Dunning) für Rechnungen
-- Fügt ein vollständiges, pro Tenant anpassbares Mahnwesen für überfällige Rechnungen hinzu:
--   - dunning_settings:   Fristen (Tage), Mahngebühren, Verzugszins pro Tenant
--   - dunning_templates:  Vorlagen (Betreff/Text) pro Mahnstufe, Sprache und Tenant.
--                         tenant_id IS NULL = Plattform-Standardvorlage, die jeder Tenant
--                         klonen und anpassen kann (gleiches Muster wie bei
--                         cancellation_policies / reminder_templates).
--   - invoice_dunning_log: Historie aller versendeten Mahnungen (Audit-Trail, rechtlich relevant)
--   - invoices: neue Spalten für aktuelle Mahnstufe / pausiert / kumulierte Mahngebühren
--
-- Mahnstufen (fix definiert, 3-stufig):
--   1 = reminder        (Zahlungserinnerung, freundlich, i.d.R. ohne Gebühr)
--   2 = first_dunning    (1. Mahnung, mit Mahngebühr)
--   3 = second_dunning   (2./letzte Mahnung, mit Mahngebühr + Inkasso-Androhung)
--
-- Additiv: bestehende invoices-Zeilen/Trigger werden nicht verändert.

-- ─────────────────────────────────────────────────────────────
-- 1) dunning_settings — Fristen, Gebühren, Verzugszins pro Tenant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dunning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,

  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Tage nach Fälligkeitsdatum, ab denen die jeweilige Stufe vorgeschlagen wird
  reminder_after_days       INTEGER NOT NULL DEFAULT 10,
  first_dunning_after_days  INTEGER NOT NULL DEFAULT 20,
  second_dunning_after_days INTEGER NOT NULL DEFAULT 30,

  -- Mahngebühren in Rappen, werden beim Versand optional zur Rechnung addiert
  reminder_fee_rappen       INTEGER NOT NULL DEFAULT 0,
  first_dunning_fee_rappen  INTEGER NOT NULL DEFAULT 2000,
  second_dunning_fee_rappen INTEGER NOT NULL DEFAULT 4000,

  -- Ob die Mahngebühr automatisch als Rechnungsposition + Totalanpassung übernommen wird
  add_fee_to_invoice_total BOOLEAN NOT NULL DEFAULT true,

  -- Verzugszins (informativ in der Mahnung ausgewiesen, Standard entspricht Art. 104 OR)
  apply_interest        BOOLEAN NOT NULL DEFAULT false,
  interest_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,

  -- Neue Zahlungsfrist (Tage ab Versanddatum der Mahnung), falls keine Vorlagen-eigene Frist gesetzt ist
  new_due_days INTEGER NOT NULL DEFAULT 10,

  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL
);

-- Nur eine Zeile pro (nicht-NULL) Tenant; die Plattform-Default-Zeile hat tenant_id = NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dunning_settings_tenant
  ON dunning_settings (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dunning_settings_tenant ON dunning_settings(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 2) dunning_templates — Betreff/Text pro Stufe, Sprache, Tenant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dunning_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,

  stage SMALLINT NOT NULL CHECK (stage IN (1, 2, 3)),
  stage_key TEXT NOT NULL CHECK (stage_key IN ('reminder', 'first_dunning', 'second_dunning')),
  CONSTRAINT check_dunning_stage_key_matches CHECK (
    (stage = 1 AND stage_key = 'reminder') OR
    (stage = 2 AND stage_key = 'first_dunning') OR
    (stage = 3 AND stage_key = 'second_dunning')
  ),

  language TEXT NOT NULL DEFAULT 'de',
  name TEXT NOT NULL,        -- Anzeigename im Admin-UI, z.B. "Zahlungserinnerung"
  subject TEXT NOT NULL,     -- E-Mail-Betreff, unterstützt Platzhalter {placeholder}
  body TEXT NOT NULL,        -- E-Mail-Text (Fliesstext), unterstützt Platzhalter {placeholder}

  is_active BOOLEAN NOT NULL DEFAULT true,

  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE (tenant_id, stage, language)
);

CREATE INDEX IF NOT EXISTS idx_dunning_templates_tenant ON dunning_templates(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 3) invoice_dunning_log — Historie aller versendeten Mahnungen
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_dunning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,

  stage SMALLINT NOT NULL CHECK (stage IN (1, 2, 3)),
  stage_key TEXT NOT NULL,
  template_id UUID NULL REFERENCES dunning_templates(id) ON DELETE SET NULL,

  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,   -- Snapshot des versendeten Inhalts (Audit-Trail)

  fee_rappen INTEGER NOT NULL DEFAULT 0,
  interest_rappen INTEGER NOT NULL DEFAULT 0,
  outstanding_amount_rappen INTEGER NOT NULL DEFAULT 0,
  new_due_date DATE NULL,

  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT NULL,

  sent_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_dunning_log_invoice ON invoice_dunning_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_dunning_log_tenant ON invoice_dunning_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_dunning_log_sent_at ON invoice_dunning_log(sent_at);

-- ─────────────────────────────────────────────────────────────
-- 4) invoices — neue Spalten für Mahnstatus
-- ─────────────────────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS dunning_level SMALLINT NOT NULL DEFAULT 0 CHECK (dunning_level BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS last_dunning_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dunning_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dunning_fees_rappen INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN invoices.dunning_level IS '0 = keine Mahnung, 1 = Zahlungserinnerung, 2 = 1. Mahnung, 3 = 2./letzte Mahnung';
COMMENT ON COLUMN invoices.dunning_paused IS 'Wenn true, wird die Rechnung im Mahnwesen-Dashboard nicht mehr als Kandidat vorgeschlagen (z.B. Ratenzahlung vereinbart)';
COMMENT ON COLUMN invoices.dunning_fees_rappen IS 'Kumulierte, bereits der Rechnung hinzugefügte Mahngebühren in Rappen';

CREATE INDEX IF NOT EXISTS idx_invoices_dunning_level ON invoices(dunning_level) WHERE dunning_level > 0;

-- ─────────────────────────────────────────────────────────────
-- 5) updated_at Trigger (nutzt bestehende Funktion aus database_migration_reminders.sql,
--    legt sie sicherheitshalber erneut an falls sie fehlt)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dunning_settings_updated_at') THEN
    CREATE TRIGGER trg_dunning_settings_updated_at
      BEFORE UPDATE ON dunning_settings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dunning_templates_updated_at') THEN
    CREATE TRIGGER trg_dunning_templates_updated_at
      BEFORE UPDATE ON dunning_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6) RLS — Autorisierung erfolgt in den Server-APIs (service role +
--    requireAdminProfile Tenant-Scoping), analog zu reminder_settings/
--    reminder_templates. Policies hier sind bewusst permissiv für
--    authenticated und dienen als zweite Verteidigungslinie.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE dunning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_dunning_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dunning_settings' AND policyname = 'dunning_settings_authenticated_rw') THEN
    CREATE POLICY dunning_settings_authenticated_rw ON dunning_settings
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dunning_templates' AND policyname = 'dunning_templates_authenticated_rw') THEN
    CREATE POLICY dunning_templates_authenticated_rw ON dunning_templates
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_dunning_log' AND policyname = 'invoice_dunning_log_authenticated_rw') THEN
    CREATE POLICY invoice_dunning_log_authenticated_rw ON invoice_dunning_log
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7) Plattform-Standardvorlagen (tenant_id IS NULL) — deutsch, Schweizer Business-Ton
--    Jeder Tenant kann diese beim ersten Bearbeiten automatisch für sich klonen
--    (siehe /api/admin/dunning-templates.post.ts).
-- ─────────────────────────────────────────────────────────────
INSERT INTO dunning_settings (tenant_id)
SELECT NULL
WHERE NOT EXISTS (SELECT 1 FROM dunning_settings WHERE tenant_id IS NULL);

INSERT INTO dunning_templates (tenant_id, stage, stage_key, language, name, subject, body)
SELECT NULL, 1, 'reminder', 'de', 'Zahlungserinnerung',
  'Zahlungserinnerung – Rechnung {rechnungsnummer}',
  E'Guten Tag {kunde_name}\n\nWir möchten Sie freundlich daran erinnern, dass die Rechnung {rechnungsnummer} vom {rechnungsdatum} über {offener_betrag} seit dem {faelligkeitsdatum} noch nicht bei uns eingegangen ist.\n\nFalls Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos. Andernfalls bitten wir Sie freundlich, den ausstehenden Betrag bis zum {neues_zahlungsziel} zu begleichen.\n\nBesten Dank für Ihr Verständnis.\n\nFreundliche Grüsse\n{absender_name}\n{firma_name}'
WHERE NOT EXISTS (
  SELECT 1 FROM dunning_templates WHERE tenant_id IS NULL AND stage = 1 AND language = 'de'
);

INSERT INTO dunning_templates (tenant_id, stage, stage_key, language, name, subject, body)
SELECT NULL, 2, 'first_dunning', 'de', '1. Mahnung',
  '1. Mahnung – Rechnung {rechnungsnummer}',
  E'Guten Tag {kunde_name}\n\nTrotz unserer Zahlungserinnerung haben wir Ihre Zahlung für die Rechnung {rechnungsnummer} über {offener_betrag} bis heute nicht erhalten. Die Rechnung ist seit dem {faelligkeitsdatum} überfällig ({ueberfaellige_tage} Tage).\n\nFür diese 1. Mahnung stellen wir Ihnen eine Mahngebühr von {mahngebuehr} in Rechnung. Der neue Gesamtbetrag beläuft sich auf {gesamtbetrag_mit_gebuehr}.\n\nWir bitten Sie, den ausstehenden Betrag bis spätestens {neues_zahlungsziel} zu überweisen. Sollte die Zahlung bereits erfolgt sein, kontaktieren Sie uns bitte kurz.\n\nFreundliche Grüsse\n{absender_name}\n{firma_name}'
WHERE NOT EXISTS (
  SELECT 1 FROM dunning_templates WHERE tenant_id IS NULL AND stage = 2 AND language = 'de'
);

INSERT INTO dunning_templates (tenant_id, stage, stage_key, language, name, subject, body)
SELECT NULL, 3, 'second_dunning', 'de', '2. / letzte Mahnung',
  '2. und letzte Mahnung – Rechnung {rechnungsnummer}',
  E'Guten Tag {kunde_name}\n\nLeider müssen wir feststellen, dass unsere bisherigen Zahlungsaufforderungen für die Rechnung {rechnungsnummer} über {offener_betrag} erfolglos blieben. Die Rechnung ist seit dem {faelligkeitsdatum} überfällig ({ueberfaellige_tage} Tage).\n\nFür diese 2. Mahnung stellen wir Ihnen eine weitere Mahngebühr von {mahngebuehr} in Rechnung. Der neue Gesamtbetrag beläuft sich auf {gesamtbetrag_mit_gebuehr}.\n\nWir fordern Sie letztmalig auf, den ausstehenden Betrag bis zum {neues_zahlungsziel} zu begleichen. Sollten wir bis zu diesem Datum keine Zahlung erhalten, sehen wir uns gezwungen, die Forderung ohne weitere Ankündigung an ein Inkassobüro zur Eintreibung zu übergeben. Die dadurch entstehenden zusätzlichen Kosten gehen vollumfänglich zu Ihren Lasten.\n\nFreundliche Grüsse\n{absender_name}\n{firma_name}'
WHERE NOT EXISTS (
  SELECT 1 FROM dunning_templates WHERE tenant_id IS NULL AND stage = 3 AND language = 'de'
);
