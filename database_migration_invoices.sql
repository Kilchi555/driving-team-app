-- Neue Tabelle für Rechnungen (Invoices)
-- Diese Tabelle speichert alle Rechnungen für Produktverkäufe und Termine

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referenzen
  product_sale_id UUID REFERENCES product_sales(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  staff_id UUID REFERENCES users(id),
  
  -- Rechnungsinformationen
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  
  -- Rechnungsempfänger (kann sich vom user unterscheiden bei Firmenrechnungen)
  billing_type VARCHAR(20) DEFAULT 'individual', -- 'individual' oder 'company'
  billing_company_name VARCHAR(255),
  billing_contact_person VARCHAR(255),
  billing_email VARCHAR(255),
  billing_street VARCHAR(255),
  billing_street_number VARCHAR(20),
  billing_zip VARCHAR(20),
  billing_city VARCHAR(100),
  billing_country VARCHAR(100) DEFAULT 'CH',
  billing_vat_number VARCHAR(50),
  
  -- Rechnungsdetails
  subtotal_rappen INTEGER NOT NULL, -- Betrag ohne MWST
  vat_rate DECIMAL(5,2) DEFAULT 7.70, -- MWST-Satz in Prozent
  vat_amount_rappen INTEGER NOT NULL, -- MWST-Betrag
  discount_amount_rappen INTEGER DEFAULT 0, -- Rabatt
  total_amount_rappen INTEGER NOT NULL, -- Endbetrag inkl. MWST
  
  -- Status und Zahlung
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue'
  payment_method VARCHAR(50),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_amount_rappen INTEGER DEFAULT 0,
  
  -- Accounto Integration
  accounto_invoice_id VARCHAR(100), -- Externe Rechnungs-ID von Accounto
  accounto_sync_status VARCHAR(20) DEFAULT 'not_synced', -- 'not_synced', 'syncing', 'synced', 'error'
  accounto_sync_error TEXT,
  accounto_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- Metadaten
  notes TEXT,
  internal_notes TEXT, -- Nur für Staff sichtbar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT check_billing_type CHECK (billing_type IN ('individual', 'company')),
  CONSTRAINT check_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  CONSTRAINT check_accounto_sync_status CHECK (accounto_sync_status IN ('not_synced', 'syncing', 'synced', 'error')),
  CONSTRAINT check_amounts CHECK (total_amount_rappen >= 0 AND subtotal_rappen >= 0 AND vat_amount_rappen >= 0),
  CONSTRAINT check_dates CHECK (due_date >= invoice_date)
);

-- Tabelle für Rechnungspositionen (Invoice Items)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  -- Produkt/Service Information
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL, -- Gespeichert für Referenz
  product_description TEXT,
  
  -- Termin Information (falls vorhanden)
  appointment_id UUID REFERENCES appointments(id),
  appointment_title VARCHAR(255),
  appointment_date TIMESTAMP WITH TIME ZONE,
  appointment_duration_minutes INTEGER,
  
  -- Preise
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price_rappen INTEGER NOT NULL,
  total_price_rappen INTEGER NOT NULL,
  
  -- MWST
  vat_rate DECIMAL(5,2) DEFAULT 7.70,
  vat_amount_rappen INTEGER NOT NULL,
  
  -- Metadaten
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_positive_amounts CHECK (quantity > 0 AND unit_price_rappen >= 0 AND total_price_rappen >= 0)
);

-- Tabelle für Rechnungszahlungen (Invoice Payments)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  -- Zahlungsinformationen
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(255), -- Externe Referenz (z.B. Wallee Transaction ID)
  amount_rappen INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'CHF',
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Metadaten
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT check_positive_amount CHECK (amount_rappen > 0)
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_staff_id ON invoices(staff_id);
CREATE INDEX IF NOT EXISTS idx_invoices_product_sale_id ON invoices(product_sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_accounto_invoice_id ON invoices(accounto_invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_appointment_id ON invoice_items(appointment_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date);

-- Funktion für automatische Rechnungsnummern
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  next_number INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  -- Jahr aus invoice_date extrahieren
  year_prefix := EXTRACT(YEAR FROM NEW.invoice_date)::VARCHAR;
  
  -- Nächste Nummer für dieses Jahr finden
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE year_prefix || '-%';
  
  -- Neue Rechnungsnummer generieren
  new_invoice_number := year_prefix || '-' || LPAD(next_number::VARCHAR, 6, '0');
  
  NEW.invoice_number := new_invoice_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatische Rechnungsnummern
CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- Funktion für automatische MWST-Berechnung
CREATE OR REPLACE FUNCTION calculate_invoice_vat()
RETURNS TRIGGER AS $$
BEGIN
  -- MWST-Betrag berechnen
  NEW.vat_amount_rappen := ROUND((NEW.subtotal_rappen * NEW.vat_rate / 100)::NUMERIC);
  
  -- Gesamtbetrag berechnen
  NEW.total_amount_rappen := NEW.subtotal_rappen + NEW.vat_amount_rappen - NEW.discount_amount_rappen;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatische MWST-Berechnung
CREATE TRIGGER trigger_calculate_invoice_vat
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_vat();

-- Funktion für automatische Fälligkeitsdatum
CREATE OR REPLACE FUNCTION set_invoice_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Fälligkeitsdatum auf 30 Tage nach Rechnungsdatum setzen
  IF NEW.due_date IS NULL THEN
    NEW.due_date := NEW.invoice_date + INTERVAL '30 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatisches Fälligkeitsdatum
CREATE TRIGGER trigger_set_invoice_due_date
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_due_date();

-- Funktion für automatische Status-Updates
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Status auf 'overdue' setzen wenn Fälligkeitsdatum überschritten
  IF NEW.due_date < CURRENT_DATE AND NEW.status = 'sent' AND NEW.payment_status != 'paid' THEN
    NEW.status := 'overdue';
    NEW.payment_status := 'overdue';
  END IF;
  
  -- Status auf 'paid' setzen wenn vollständig bezahlt
  IF NEW.paid_amount_rappen >= NEW.total_amount_rappen AND NEW.payment_status != 'paid' THEN
    NEW.payment_status := 'paid';
    NEW.status := 'paid';
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatische Status-Updates
CREATE TRIGGER trigger_update_invoice_status
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Trigger für automatische Termin-Status-Updates wenn Rechnung bezahlt wird
CREATE OR REPLACE FUNCTION update_appointment_status_on_invoice_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn Rechnung auf 'paid' gesetzt wird, setze alle verknüpften Termine auf 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Aktualisiere Termine die über appointment_id verknüpft sind
    IF NEW.appointment_id IS NOT NULL THEN
      UPDATE appointments 
      SET status = 'paid', updated_at = NOW()
      WHERE id = NEW.appointment_id;
    END IF;
    
    -- Aktualisiere Termine die über invoice_items verknüpft sind
    UPDATE appointments 
    SET status = 'paid', updated_at = NOW()
    WHERE id IN (
      SELECT appointment_id 
      FROM invoice_items 
      WHERE invoice_id = NEW.id AND appointment_id IS NOT NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatische Termin-Status-Updates
CREATE TRIGGER trigger_update_appointment_status_on_invoice_paid
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status_on_invoice_paid();

-- Funktion für Rechnungszusammenfassung
CREATE OR REPLACE FUNCTION get_invoice_summary()
RETURNS TABLE (
  total_invoices BIGINT,
  total_amount BIGINT,
  paid_amount BIGINT,
  pending_amount BIGINT,
  overdue_amount BIGINT,
  draft_amount BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_invoices,
    COALESCE(SUM(total_amount_rappen), 0)::BIGINT as total_amount,
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount_rappen ELSE 0 END), 0)::BIGINT as paid_amount,
    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount_rappen ELSE 0 END), 0)::BIGINT as pending_amount,
    COALESCE(SUM(CASE WHEN payment_status = 'overdue' THEN total_amount_rappen ELSE 0 END), 0)::BIGINT as overdue_amount,
    COALESCE(SUM(CASE WHEN status = 'draft' THEN total_amount_rappen ELSE 0 END), 0)::BIGINT as draft_amount
  FROM invoices
  WHERE status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) aktivieren
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies für invoices
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can create invoices" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can update invoices" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies für invoice_items
CREATE POLICY "Users can view their own invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can manage invoice items" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- RLS Policies für invoice_payments
CREATE POLICY "Users can view their own invoice payments" ON invoice_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_payments.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all invoice payments" ON invoice_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can manage invoice payments" ON invoice_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'staff')
    )
  );

-- View für einfachere Abfragen
CREATE OR REPLACE VIEW invoices_with_details AS
SELECT 
  i.*,
  u.first_name as customer_first_name,
  u.last_name as customer_last_name,
  u.email as customer_email,
  s.first_name as staff_first_name,
  s.last_name as staff_last_name,
  s.email as staff_email,
  ps.total_amount_rappen as product_sale_total,
  a.title as appointment_title,
  a.start_time as appointment_start,
  a.duration_minutes as appointment_duration
FROM invoices i
LEFT JOIN users u ON i.user_id = u.id
LEFT JOIN users s ON i.staff_id = s.id
LEFT JOIN product_sales ps ON i.product_sale_id = ps.id
LEFT JOIN appointments a ON i.appointment_id = a.id;

-- Kommentare für bessere Dokumentation
COMMENT ON TABLE invoices IS 'Haupttabelle für alle Rechnungen im System';
COMMENT ON TABLE invoice_items IS 'Einzelne Positionen einer Rechnung';
COMMENT ON TABLE invoice_payments IS 'Zahlungen zu Rechnungen';
COMMENT ON COLUMN invoices.invoice_number IS 'Eindeutige Rechnungsnummer im Format YYYY-XXXXXX';
COMMENT ON COLUMN invoices.billing_type IS 'Art des Rechnungsempfängers: individual oder company';
COMMENT ON COLUMN invoices.vat_rate IS 'MWST-Satz in Prozent (Standard: 7.70%)';
COMMENT ON COLUMN invoices.status IS 'Status der Rechnung: draft, sent, paid, overdue, cancelled';
COMMENT ON COLUMN invoices.payment_status IS 'Zahlungsstatus: pending, partial, paid, overdue';
COMMENT ON COLUMN invoices.accounto_sync_status IS 'Synchronisationsstatus mit Accounto';

-- ✅ KORRIGIERT: Bestehende Rechnungen aktualisieren (keine MWST)
-- Alle bestehenden Rechnungen auf MWST-frei setzen
UPDATE invoices 
SET 
  vat_rate = 0,
  vat_amount_rappen = 0,
  total_amount_rappen = subtotal_rappen - discount_amount_rappen
WHERE vat_amount_rappen > 0;

-- Alle bestehenden Rechnungspositionen auf MWST-frei setzen
UPDATE invoice_items 
SET 
  vat_rate = 0,
  vat_amount_rappen = 0
WHERE vat_amount_rappen > 0;

-- Kommentar für die Korrektur
COMMENT ON TABLE invoices IS 'Haupttabelle für alle Rechnungen im System (MWST-frei)';

-- Trigger für automatisches Befüllen der invoice_items
CREATE OR REPLACE FUNCTION populate_invoice_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn ein Termin verknüpft ist, erstelle einen Rechnungsposten
  IF NEW.appointment_id IS NOT NULL THEN
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      product_name,
      product_description,
      appointment_id,
      appointment_title,
      appointment_date,
      appointment_duration_minutes,
      quantity,
      unit_price_rappen,
      total_price_rappen,
      vat_rate,
      vat_amount_rappen,
      sort_order,
      notes
    )
    SELECT 
      NEW.id,
      NULL, -- Kein spezifisches Produkt für Termine
      COALESCE(et.name, 'Fahrstunde'),
      et.description,
      a.id,
      a.title,
      a.start_time,
      COALESCE(a.duration_minutes, et.default_duration_minutes),
      1,
      0, -- Preis wird später aus der Rechnung übernommen
      0, -- Preis wird später aus der Rechnung übernommen
      0, -- Keine MWST
      0, -- Keine MWST
      1,
      'Automatisch erstellt aus Termin'
    FROM appointments a
    LEFT JOIN event_types et ON a.event_type_code = et.code
    WHERE a.id = NEW.appointment_id;
  END IF;

  -- Wenn ein Produktverkauf verknüpft ist, erstelle Rechnungsposten
  IF NEW.product_sale_id IS NOT NULL THEN
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      product_name,
      product_description,
      quantity,
      unit_price_rappen,
      total_price_rappen,
      vat_rate,
      vat_amount_rappen,
      sort_order,
      notes
    )
    SELECT 
      NEW.id,
      psi.product_id,
      p.name,
      p.description,
      psi.quantity,
      psi.unit_price_rappen,
      psi.total_price_rappen,
      0, -- Keine MWST
      0, -- Keine MWST
      ROW_NUMBER() OVER (PARTITION BY NEW.id ORDER BY p.name),
      'Automatisch erstellt aus Produktverkauf'
    FROM product_sale_items psi
    JOIN products p ON psi.product_id = p.id
    WHERE psi.product_sale_id = NEW.product_sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger aktivieren
DROP TRIGGER IF EXISTS trigger_populate_invoice_items ON invoices;
CREATE TRIGGER trigger_populate_invoice_items
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION populate_invoice_items();

-- Trigger für bestehende Rechnungen (einmalige Ausführung)
CREATE OR REPLACE FUNCTION populate_existing_invoice_items()
RETURNS void AS $$
BEGIN
  -- Für alle bestehenden Rechnungen mit Terminen
  INSERT INTO invoice_items (
    invoice_id,
    product_id,
    product_name,
    product_description,
    appointment_id,
    appointment_title,
    appointment_date,
    appointment_duration_minutes,
    quantity,
    unit_price_rappen,
    total_price_rappen,
    vat_rate,
    vat_amount_rappen,
    sort_order,
    notes
  )
      SELECT 
      i.id,
      NULL, -- Kein spezifisches Produkt für Termine
      COALESCE(et.name, 'Fahrstunde'),
      et.description,
      a.id,
      a.title,
      a.start_time,
      COALESCE(a.duration_minutes, et.default_duration_minutes),
      1,
      0, -- Preis wird später aus der Rechnung übernommen
      0, -- Preis wird später aus der Rechnung übernommen
      0,
      0,
      1,
      'Nachträglich erstellt'
  FROM invoices i
  JOIN appointments a ON i.appointment_id = a.id
  LEFT JOIN event_types et ON a.event_type_code = et.code
  WHERE i.appointment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
  );

  -- Für alle bestehenden Rechnungen mit Produktverkäufen
  INSERT INTO invoice_items (
    invoice_id,
    product_id,
    product_name,
    product_description,
    quantity,
    unit_price_rappen,
    total_price_rappen,
    vat_rate,
    vat_amount_rappen,
    sort_order,
    notes
  )
  SELECT 
    i.id,
    psi.product_id,
    p.name,
    p.description,
          psi.quantity,
      psi.unit_price_rappen,
      psi.total_price_rappen,
      0,
      0,
      ROW_NUMBER() OVER (PARTITION BY i.id ORDER BY p.name),
      'Nachträglich erstellt'
  FROM invoices i
  JOIN product_sale_items psi ON i.product_sale_id = psi.product_sale_id
  JOIN products p ON psi.product_id = p.id
  WHERE i.product_sale_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
  );
END;
$$ LANGUAGE plpgsql;

-- Funktion für bestehende Rechnungen ausführen
SELECT populate_existing_invoice_items();
