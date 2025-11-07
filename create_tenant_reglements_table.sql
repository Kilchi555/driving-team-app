-- Migration: Create tenant_reglements table for storing legal documents
-- Diese Tabelle speichert Reglemente (Datenschutz, AGB, etc.) pro Tenant
-- Templates haben tenant_id = NULL und können von Tenants geladen werden
-- Date: 2025-11-04

-- 1. Create tenant_reglements table
CREATE TABLE IF NOT EXISTS tenant_reglements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL für Templates
  type VARCHAR(50) NOT NULL, -- 'datenschutz', 'nutzungsbedingungen', 'agb', 'haftung', 'rueckerstattung'
  title VARCHAR(255) NOT NULL, -- Titel des Reglements
  content TEXT NOT NULL, -- HTML-Content des Reglements
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Ensure unique type per tenant (or NULL for templates)
  CONSTRAINT unique_reglement_per_tenant UNIQUE (tenant_id, type)
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_reglements_tenant_id ON tenant_reglements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_reglements_type ON tenant_reglements(type);
CREATE INDEX IF NOT EXISTS idx_tenant_reglements_active ON tenant_reglements(is_active);

-- 3. Add RLS (Row Level Security)
ALTER TABLE tenant_reglements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view active reglements for their tenant or templates
CREATE POLICY "Users can view reglements" ON tenant_reglements
  FOR SELECT USING (
    is_active = true AND (
      tenant_id IS NULL OR -- Templates are visible to all
      tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Policy: Admins can manage reglements for their tenant
CREATE POLICY "Admins can manage reglements" ON tenant_reglements
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_reglements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_reglements_updated_at 
  BEFORE UPDATE ON tenant_reglements 
  FOR EACH ROW EXECUTE FUNCTION update_reglements_updated_at();

-- 5. Insert default templates (tenant_id = NULL)
INSERT INTO tenant_reglements (tenant_id, type, title, content, is_active) VALUES
-- Datenschutzerklärung Template
(
  NULL,
  'datenschutz',
  'Datenschutzerklärung',
  '<h2>Datenschutzerklärung</h2>
<p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten.</p>

<h3>1. Verantwortliche Stelle</h3>
<p>Die verantwortliche Stelle für die Datenverarbeitung ist die Fahrschule, bei der Sie Ihre Fahrstunden buchen.</p>

<h3>2. Erhebung und Speicherung personenbezogener Daten</h3>
<p>Wir erheben und speichern folgende personenbezogene Daten:</p>
<ul>
  <li>Name, Vorname</li>
  <li>E-Mail-Adresse</li>
  <li>Telefonnummer</li>
  <li>Adresse</li>
  <li>Termindaten</li>
  <li>Zahlungsdaten (verschlüsselt)</li>
</ul>

<h3>3. Zweck der Datenverarbeitung</h3>
<p>Ihre Daten werden verwendet für:</p>
<ul>
  <li>Terminplanung und -verwaltung</li>
  <li>Kommunikation bezüglich Ihrer Fahrstunden</li>
  <li>Abrechnung und Zahlungsabwicklung</li>
  <li>Erfüllung gesetzlicher Bestimmungen</li>
</ul>

<h3>4. Datenweitergabe</h3>
<p>Ihre Daten werden nicht an Dritte weitergegeben, außer es ist gesetzlich vorgeschrieben oder für die Erfüllung unserer Dienstleistungen notwendig.</p>

<h3>5. Ihre Rechte</h3>
<p>Sie haben das Recht auf:</p>
<ul>
  <li>Auskunft über Ihre gespeicherten Daten</li>
  <li>Berichtigung unrichtiger Daten</li>
  <li>Löschung Ihrer Daten</li>
  <li>Einschränkung der Verarbeitung</li>
  <li>Widerspruch gegen die Verarbeitung</li>
</ul>',
  true
),

-- Nutzungsbedingungen Template
(
  NULL,
  'nutzungsbedingungen',
  'Nutzungsbedingungen',
  '<h2>Nutzungsbedingungen</h2>
<p>Diese Nutzungsbedingungen regeln die Nutzung unserer Online-Plattform für die Buchung von Fahrstunden.</p>

<h3>1. Geltungsbereich</h3>
<p>Diese Bedingungen gelten für alle Nutzer unserer Plattform und alle damit verbundenen Dienstleistungen.</p>

<h3>2. Registrierung und Account</h3>
<p>Für die Nutzung der Plattform ist eine Registrierung erforderlich. Sie sind verpflichtet, wahrheitsgemäße Angaben zu machen und Ihre Zugangsdaten sicher aufzubewahren.</p>

<h3>3. Buchung von Fahrstunden</h3>
<p>Fahrstunden können über die Plattform gebucht werden. Die Buchung ist verbindlich, sobald sie bestätigt wurde.</p>

<h3>4. Stornierungsregeln</h3>
<p>Stornierungen sind gemäss den geltenden Stornierungsrichtlinien möglich. Details finden Sie in den Allgemeinen Geschäftsbedingungen.</p>

<h3>5. Zahlungsbedingungen</h3>
<p>Die Zahlung erfolgt gemäss den vereinbarten Zahlungsbedingungen. Bei wiederholten Zahlungsverzögerungen behalten wir uns das Recht vor, weitere Buchungen zu verweigern.</p>',
  true
),

-- AGB Template
(
  NULL,
  'agb',
  'Allgemeine Geschäftsbedingungen (AGB)',
  '<h2>Allgemeine Geschäftsbedingungen (AGB)</h2>
<p>Diese Allgemeinen Geschäftsbedingungen regeln das Vertragsverhältnis zwischen Ihnen und der Fahrschule.</p>

<h3>1. Vertragsgegenstand</h3>
<p>Gegenstand des Vertrags ist die Erteilung von Fahrstunden und die Vorbereitung auf die praktische Führerscheinprüfung.</p>

<h3>2. Preise und Zahlung</h3>
<p>Die Preise für Fahrstunden sind auf der Plattform angegeben. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt gemäss den vereinbarten Zahlungsbedingungen.</p>

<h3>3. Termine und Stornierung</h3>
<p>Termine müssen mindestens 24 Stunden vorher storniert werden, um Stornogebühren zu vermeiden. Bei späteren Stornierungen können gemäss Stornierungsrichtlinien Gebühren anfallen.</p>

<h3>4. Haftung</h3>
<p>Die Haftung beschränkt sich auf Vorsatz und grobe Fahrlässigkeit. Weitere Details finden Sie im Haftungsausschluss.</p>

<h3>5. Datenschutz</h3>
<p>Ihre Daten werden gemäss unserer Datenschutzerklärung behandelt.</p>',
  true
),

-- Haftungsausschluss Template
(
  NULL,
  'haftung',
  'Haftungsausschluss',
  '<h2>Haftungsausschluss</h2>
<p>Diese Haftungsausschlussbestimmungen regeln die Haftung der Fahrschule für Schäden, die im Zusammenhang mit den Fahrstunden entstehen können.</p>

<h3>1. Haftungsbeschränkung</h3>
<p>Die Fahrschule haftet nur für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Für leichte Fahrlässigkeit haftet die Fahrschule nur bei Verletzung wesentlicher Vertragspflichten.</p>

<h3>2. Fahrzeugschäden</h3>
<p>Fahrzeugschäden, die während der Fahrstunde durch den Fahrschüler verursacht werden, sind durch die Fahrschule versichert. Eigenanteile oder Selbstbeteiligungen können anfallen.</p>

<h3>3. Personenschäden</h3>
<p>Personenschäden sind durch die Haftpflichtversicherung der Fahrschule abgedeckt. Der Fahrschüler ist verpflichtet, sich an die Anweisungen des Fahrlehrers zu halten.</p>

<h3>4. Haftungsausschluss für Dritte</h3>
<p>Die Fahrschule übernimmt keine Haftung für Schäden Dritter, die nicht auf ein Verschulden der Fahrschule zurückzuführen sind.</p>',
  true
),

-- Rückerstattungsrichtlinien Template
(
  NULL,
  'rueckerstattung',
  'Rückerstattungsrichtlinien',
  '<h2>Rückerstattungsrichtlinien</h2>
<p>Diese Richtlinien regeln die Bedingungen für Rückerstattungen von Zahlungen.</p>

<h3>1. Stornierung durch den Fahrschüler</h3>
<p>Bei Stornierung durch den Fahrschüler gelten die Stornierungsrichtlinien. Bereits bezahlte Beträge werden gemäss diesen Richtlinien zurückerstattet, abzüglich eventueller Stornogebühren.</p>

<h3>2. Stornierung durch die Fahrschule</h3>
<p>Bei Stornierung durch die Fahrschule wird der volle Betrag zurückerstattet.</p>

<h3>3. Rückerstattungsfrist</h3>
<p>Rückerstattungen werden innerhalb von 14 Tagen nach Antragstellung bearbeitet. Die Gutschrift auf Ihrem Konto kann je nach Zahlungsmethode zusätzliche Zeit in Anspruch nehmen.</p>

<h3>4. Zahlungsmethode</h3>
<p>Rückerstattungen erfolgen auf das ursprünglich verwendete Zahlungsmittel. Bei Barzahlung erfolgt die Rückerstattung auf ein angegebenes Bankkonto.</p>

<h3>5. Teilweise Rückerstattung</h3>
<p>Bei Teilrückerstattungen (z.B. nach Stornogebühren) wird der verbleibende Betrag zurückerstattet.</p>',
  true
)
ON CONFLICT DO NOTHING;

-- 6. Comments
COMMENT ON TABLE tenant_reglements IS 'Speichert Reglemente (Datenschutz, AGB, etc.) pro Tenant. Templates haben tenant_id = NULL.';
COMMENT ON COLUMN tenant_reglements.tenant_id IS 'NULL für Templates, sonst die tenant_id des Tenants';
COMMENT ON COLUMN tenant_reglements.type IS 'Typ des Reglements: datenschutz, nutzungsbedingungen, agb, haftung, rueckerstattung';
COMMENT ON COLUMN tenant_reglements.content IS 'HTML-Content des Reglements';

