-- Fahrlehrer Leads – gesammelte Fahrlehrerkontakte aus der Deutschschweiz
-- Gesammelt via tools/sammle_tel.py (fahrlehrer.ch, fahrlehrervergleich.ch, superfahrlehrer.ch)

CREATE TABLE IF NOT EXISTS fahrlehrer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Kontaktdaten
  name          TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  postal_code   TEXT,
  email         TEXT,
  website       TEXT,

  -- Herkunft
  source        TEXT NOT NULL,           -- z.B. 'fahrlehrer.ch', 'fahrlehrervergleich.ch'
  source_url    TEXT,                    -- Direkte URL des Eintrags

  -- CRM Status
  status        TEXT DEFAULT 'new',      -- new | contacted | interested | not_interested | customer
  notes         TEXT,
  contacted_at  TIMESTAMP WITH TIME ZONE,
  contacted_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique-Constraint: gleiche Telefonnummer nicht doppelt speichern
CREATE UNIQUE INDEX IF NOT EXISTS idx_fahrlehrer_leads_phone_unique
  ON fahrlehrer_leads(phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE INDEX IF NOT EXISTS idx_fahrlehrer_leads_status     ON fahrlehrer_leads(status);
CREATE INDEX IF NOT EXISTS idx_fahrlehrer_leads_source     ON fahrlehrer_leads(source);
CREATE INDEX IF NOT EXISTS idx_fahrlehrer_leads_created_at ON fahrlehrer_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fahrlehrer_leads_postal     ON fahrlehrer_leads(postal_code);

-- Auto-Update für updated_at
CREATE OR REPLACE FUNCTION update_fahrlehrer_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_fahrlehrer_leads_updated_at
  BEFORE UPDATE ON fahrlehrer_leads
  FOR EACH ROW EXECUTE FUNCTION update_fahrlehrer_leads_updated_at();

-- RLS aktivieren
ALTER TABLE fahrlehrer_leads ENABLE ROW LEVEL SECURITY;

-- Nur authentifizierte Benutzer können lesen/schreiben
CREATE POLICY "Authenticated users can read leads" ON fahrlehrer_leads
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads" ON fahrlehrer_leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads" ON fahrlehrer_leads
  FOR UPDATE TO authenticated
  USING (true);

-- Service Role darf alles (für Import-Scripts)
CREATE POLICY "Service role full access" ON fahrlehrer_leads
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE fahrlehrer_leads IS 'Fahrlehrerkontakte aus der Deutschschweiz – gesammelt via Web-Scraping';
COMMENT ON COLUMN fahrlehrer_leads.status IS 'CRM-Status: new | contacted | interested | not_interested | customer';
COMMENT ON COLUMN fahrlehrer_leads.source IS 'Quell-Website, z.B. fahrlehrer.ch';
