-- Bargeldkontrolle System Migration
-- Erstellt die notwendigen Tabellen für die Bargeldverwaltung

-- 0. Cleanup: Lösche bestehende Policies, Funktionen und Trigger (falls vorhanden)
DROP TRIGGER IF EXISTS trigger_create_cash_transaction ON payments;
DROP FUNCTION IF EXISTS create_cash_transaction_from_payment();
DROP FUNCTION IF EXISTS confirm_cash_transaction(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS create_cash_transaction(UUID, UUID, UUID, INTEGER, TEXT);

-- Lösche bestehende Policies
DROP POLICY IF EXISTS "Admins can view all cash transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Instructors can view own cash transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Admins can update all cash transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Instructors can update own pending transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Admins can insert all cash transactions" ON cash_transactions;
DROP POLICY IF EXISTS "Instructors can insert own cash transactions" ON cash_transactions;

DROP POLICY IF EXISTS "Admins can view all confirmations" ON cash_confirmations;
DROP POLICY IF EXISTS "Instructors can view confirmations of own transactions" ON cash_confirmations;
DROP POLICY IF EXISTS "Only admins can insert confirmations" ON cash_confirmations;

-- Lösche bestehende Trigger
DROP TRIGGER IF EXISTS update_cash_transactions_updated_at ON cash_transactions;

-- 1. Bargeldtransaktionen Tabelle
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES users(id) NOT NULL,
  student_id UUID REFERENCES users(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id) NOT NULL,
  amount_rappen INTEGER NOT NULL CHECK (amount_rappen > 0), -- Betrag in Rappen
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bargeldbestätigungen Tabelle (für Audit-Trail)
CREATE TABLE IF NOT EXISTS cash_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES cash_transactions(id) NOT NULL,
  confirmed_by UUID REFERENCES users(id) NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  amount_confirmed INTEGER NOT NULL CHECK (amount_confirmed > 0) -- Bestätigter Betrag in Rappen
);

-- 3. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_cash_transactions_instructor_id ON cash_transactions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_student_id ON cash_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_appointment_id ON cash_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_status ON cash_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_at ON cash_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_cash_confirmations_transaction_id ON cash_confirmations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cash_confirmations_confirmed_by ON cash_confirmations(confirmed_by);

-- 4. RLS (Row Level Security) Policies
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policy für cash_transactions
-- Admins können alle Transaktionen sehen
CREATE POLICY "Admins can view all cash transactions" ON cash_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fahrlehrer können nur ihre eigenen Transaktionen sehen
CREATE POLICY "Instructors can view own cash transactions" ON cash_transactions
  FOR SELECT USING (
    instructor_id = auth.uid()
  );

-- Admins können alle Transaktionen bearbeiten
CREATE POLICY "Admins can update all cash transactions" ON cash_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fahrlehrer können nur ihre eigenen ausstehenden Transaktionen bearbeiten
CREATE POLICY "Instructors can update own pending transactions" ON cash_transactions
  FOR UPDATE USING (
    instructor_id = auth.uid() AND status = 'pending'
  );

-- Admins können alle Transaktionen einfügen
CREATE POLICY "Admins can insert all cash transactions" ON cash_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fahrlehrer können ihre eigenen Transaktionen einfügen
CREATE POLICY "Instructors can insert own cash transactions" ON cash_transactions
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
  );

-- RLS Policy für cash_confirmations
-- Admins können alle Bestätigungen sehen
CREATE POLICY "Admins can view all confirmations" ON cash_confirmations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fahrlehrer können nur Bestätigungen ihrer eigenen Transaktionen sehen
CREATE POLICY "Instructors can view confirmations of own transactions" ON cash_confirmations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cash_transactions ct
      WHERE ct.id = cash_confirmations.transaction_id 
      AND ct.instructor_id = auth.uid()
    )
  );

-- Nur Admins können Bestätigungen einfügen
CREATE POLICY "Only admins can insert confirmations" ON cash_confirmations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cash_transactions_updated_at 
  BEFORE UPDATE ON cash_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Funktion zum Erstellen einer Bargeldtransaktion
CREATE OR REPLACE FUNCTION create_cash_transaction(
  p_instructor_id UUID,
  p_student_id UUID,
  p_appointment_id UUID,
  p_amount_rappen INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Prüfe ob der Benutzer ein Fahrlehrer ist
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_instructor_id AND role IN ('instructor', 'admin')
  ) THEN
    RAISE EXCEPTION 'Nur Fahrlehrer können Bargeldtransaktionen erstellen';
  END IF;

  -- Prüfe ob der Termin existiert und dem Fahrlehrer gehört
  IF NOT EXISTS (
    SELECT 1 FROM appointments 
    WHERE id = p_appointment_id AND user_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Termin nicht gefunden';
  END IF;

  -- Erstelle die Transaktion
  INSERT INTO cash_transactions (
    instructor_id,
    student_id,
    appointment_id,
    amount_rappen,
    notes
  ) VALUES (
    p_instructor_id,
    p_student_id,
    p_appointment_id,
    p_amount_rappen,
    p_notes
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funktion zum Bestätigen einer Bargeldtransaktion
CREATE OR REPLACE FUNCTION confirm_cash_transaction(
  p_transaction_id UUID,
  p_confirmed_by UUID,
  p_amount_confirmed INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_transaction_exists BOOLEAN;
BEGIN
  -- Prüfe ob der Benutzer ein Admin ist
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_confirmed_by AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Nur Admins können Bargeldtransaktionen bestätigen';
  END IF;

  -- Prüfe ob die Transaktion existiert und ausstehend ist
  SELECT EXISTS(
    SELECT 1 FROM cash_transactions 
    WHERE id = p_transaction_id AND status = 'pending'
  ) INTO v_transaction_exists;

  IF NOT v_transaction_exists THEN
    RAISE EXCEPTION 'Transaktion nicht gefunden oder bereits bestätigt';
  END IF;

  -- Bestätige die Transaktion
  UPDATE cash_transactions 
  SET 
    status = 'confirmed',
    confirmed_by_admin = p_confirmed_by,
    confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Erstelle den Bestätigungsdatensatz
  INSERT INTO cash_confirmations (
    transaction_id,
    confirmed_by,
    amount_confirmed,
    notes
  ) VALUES (
    p_transaction_id,
    p_confirmed_by,
    p_amount_confirmed,
    p_notes
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Kommentare für bessere Dokumentation
COMMENT ON TABLE cash_transactions IS 'Bargeldtransaktionen von Fahrlehrern';
COMMENT ON TABLE cash_confirmations IS 'Bestätigungen von Bargeldtransaktionen durch Admins';
COMMENT ON FUNCTION create_cash_transaction IS 'Erstellt eine neue Bargeldtransaktion (nur für Fahrlehrer)';
COMMENT ON FUNCTION confirm_cash_transaction IS 'Bestätigt eine Bargeldtransaktion (nur für Admins)';

-- 9. Beispiel-Daten (optional - für Tests)
-- INSERT INTO cash_transactions (instructor_id, student_id, appointment_id, amount_rappen, notes) 
-- VALUES (
--   '00000000-0000-0000-0000-000000000001', -- instructor_id
--   '00000000-0000-0000-0000-000000000002', -- student_id  
--   '00000000-0000-0000-0000-000000000003', -- appointment_id
--   5000, -- 50 CHF
--   'Schüler hat mit 50 CHF Schein bezahlt'
-- );

-- 10. Trigger für automatische Erstellung von cash_transactions bei Barzahlungen
CREATE OR REPLACE FUNCTION create_cash_transaction_from_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_appointment_data RECORD;
  v_instructor_id UUID;
BEGIN
  -- Nur ausführen wenn es eine Barzahlung ist UND der Schüler tatsächlich bezahlt hat
  IF NEW.payment_method = 'cash' AND NEW.payment_status = 'completed' THEN
    
    -- Hole Appointment-Daten um instructor_id zu bekommen
    SELECT 
      user_id as student_id,
      staff_id as instructor_id,
      id as appointment_id
    INTO v_appointment_data
    FROM appointments 
    WHERE id = NEW.appointment_id;
    
    -- Wenn kein staff_id gesetzt ist, verwende den current_user als instructor
    IF v_appointment_data.instructor_id IS NULL THEN
      v_instructor_id := auth.uid();
    ELSE
      v_instructor_id := v_appointment_data.instructor_id;
    END IF;
    
    -- Erstelle cash_transaction nur wenn noch nicht existiert
    IF NOT EXISTS (
      SELECT 1 FROM cash_transactions 
      WHERE appointment_id = NEW.appointment_id 
      AND status != 'disputed'
    ) THEN
      
      INSERT INTO cash_transactions (
        instructor_id,
        student_id,
        appointment_id,
        amount_rappen,
        notes,
        status
      ) VALUES (
        v_instructor_id,
        v_appointment_data.student_id,
        v_appointment_data.appointment_id,
        NEW.total_amount_rappen,
        NULL,
        'pending'
      );
      
      RAISE NOTICE 'Cash transaction created: % Rappen', NEW.total_amount_rappen;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf payments Tabelle
CREATE TRIGGER trigger_create_cash_transaction
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION create_cash_transaction_from_payment();

-- 11. Kommentar für den neuen Trigger
COMMENT ON FUNCTION create_cash_transaction_from_payment IS 'Erstellt automatisch cash_transaction Einträge bei Barzahlungen';
COMMENT ON TRIGGER trigger_create_cash_transaction ON payments IS 'Trigger für automatische Cash-Transaction-Erstellung';

-- 12. Kassenverwaltung
-- Neue Tabelle für Kassenstände der Fahrlehrer
CREATE TABLE IF NOT EXISTS cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES users(id) NOT NULL UNIQUE,
  current_balance_rappen INTEGER NOT NULL DEFAULT 0 CHECK (current_balance_rappen >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Neue Tabelle für alle Kassenbewegungen (Audit-Trail)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES users(id) NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal', 'cash_transaction', 'adjustment')),
  amount_rappen INTEGER NOT NULL CHECK (amount_rappen > 0),
  balance_before_rappen INTEGER NOT NULL,
  balance_after_rappen INTEGER NOT NULL,
  reference_id UUID, -- Verweis auf cash_transactions, cash_balances oder NULL für manuelle Bewegungen
  reference_type TEXT, -- 'cash_transaction', 'cash_balance', 'manual'
  performed_by UUID REFERENCES users(id) NOT NULL, -- Wer hat die Aktion durchgeführt
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_cash_balances_instructor_id ON cash_balances(instructor_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_instructor_id ON cash_movements(instructor_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(movement_type);

-- RLS Policies für Kassenverwaltung
ALTER TABLE cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Admins können alle Kassenstände sehen
CREATE POLICY "Admins can view all cash balances" ON cash_balances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Fahrlehrer können nur ihren eigenen Kassenstand sehen
CREATE POLICY "Instructors can view own cash balance" ON cash_balances
  FOR SELECT USING (
    instructor_id = auth.uid()
  );

-- Nur Admins können Kassenstände bearbeiten
CREATE POLICY "Only admins can update cash balances" ON cash_balances
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Nur Admins können Kassenstände einfügen
CREATE POLICY "Only admins can insert cash balances" ON cash_balances
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins können alle Kassenbewegungen sehen
CREATE POLICY "Admins can view all cash movements" ON cash_movements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Fahrlehrer können nur ihre eigenen Kassenbewegungen sehen
CREATE POLICY "Instructors can view own cash movements" ON cash_movements
  FOR SELECT USING (
    instructor_id = auth.uid()
  );

-- Nur Admins können Kassenbewegungen einfügen
CREATE POLICY "Only admins can insert cash movements" ON cash_movements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger für updated_at bei cash_balances
CREATE TRIGGER update_cash_balances_updated_at 
  BEFORE UPDATE ON cash_balances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Funktionen für Kassenverwaltung

-- Funktion zum Aufstocken der Kasse (nur für Admins)
CREATE OR REPLACE FUNCTION top_up_cash_balance(
  p_instructor_id UUID,
  p_amount_rappen INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_performed_by UUID;
BEGIN
  -- Setze performed_by auf current_user falls nicht angegeben
  IF p_performed_by IS NULL THEN
    v_performed_by := auth.uid();
  ELSE
    v_performed_by := p_performed_by;
  END IF;

  -- Prüfe ob der Benutzer ein Admin ist
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_performed_by AND role = 'admin') THEN
    RAISE EXCEPTION 'Nur Admins können Kassen aufstocken';
  END IF;

  -- Hole aktuellen Kassenstand oder erstelle neuen
  SELECT current_balance_rappen INTO v_current_balance
  FROM cash_balances 
  WHERE instructor_id = p_instructor_id;

  IF v_current_balance IS NULL THEN
    -- Erstelle neuen Kassenstand
    INSERT INTO cash_balances (instructor_id, current_balance_rappen, notes)
    VALUES (p_instructor_id, p_amount_rappen, p_notes);
    
    v_current_balance := 0;
    v_new_balance := p_amount_rappen;
  ELSE
    -- Aktualisiere bestehenden Kassenstand
    UPDATE cash_balances 
    SET current_balance_rappen = current_balance_rappen + p_amount_rappen,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE instructor_id = p_instructor_id;
    
    v_new_balance := v_current_balance + p_amount_rappen;
  END IF;

  -- Erstelle Kassenbewegung
  INSERT INTO cash_movements (
    instructor_id,
    movement_type,
    amount_rappen,
    balance_before_rappen,
    balance_after_rappen,
    reference_type,
    performed_by,
    notes
  ) VALUES (
    p_instructor_id,
    'deposit',
    p_amount_rappen,
    v_current_balance,
    v_new_balance,
    'manual',
    v_performed_by,
    p_notes
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion zum Abziehen von Bargeldtransaktionen
CREATE OR REPLACE FUNCTION withdraw_cash_transaction(
  p_transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_transaction RECORD;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Hole Transaktionsdaten
  SELECT * INTO v_transaction
  FROM cash_transactions 
  WHERE id = p_transaction_id;

  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaktion nicht gefunden';
  END IF;

  -- Hole aktuellen Kassenstand
  SELECT current_balance_rappen INTO v_current_balance
  FROM cash_balances 
  WHERE instructor_id = v_transaction.instructor_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Kein Kassenstand für diesen Fahrlehrer gefunden';
  END IF;

  -- Prüfe ob genügend Geld in der Kasse ist
  IF v_current_balance < v_transaction.amount_rappen THEN
    RAISE EXCEPTION 'Nicht genügend Geld in der Kasse. Verfügbar: % Rappen, Benötigt: % Rappen', 
      v_current_balance, v_transaction.amount_rappen;
  END IF;

  -- Berechne neuen Kassenstand
  v_new_balance := v_current_balance - v_transaction.amount_rappen;

  -- Aktualisiere Kassenstand
  UPDATE cash_balances 
  SET current_balance_rappen = v_new_balance,
      updated_at = NOW()
  WHERE instructor_id = v_transaction.instructor_id;

  -- Erstelle Kassenbewegung
  INSERT INTO cash_movements (
    instructor_id,
    movement_type,
    amount_rappen,
    balance_before_rappen,
    balance_after_rappen,
    reference_id,
    reference_type,
    performed_by,
    notes
  ) VALUES (
    v_transaction.instructor_id,
    'cash_transaction',
    v_transaction.amount_rappen,
    v_current_balance,
    v_new_balance,
    p_transaction_id,
    'cash_transaction',
    v_transaction.instructor_id,
    'Automatischer Abzug für Bargeldtransaktion'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Trigger für automatische Kassenabzüge bei Bargeldtransaktionen
CREATE OR REPLACE FUNCTION trigger_cash_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur ausführen wenn der Status auf 'confirmed' gesetzt wird
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Ziehe den Betrag von der Kasse ab
    PERFORM withdraw_cash_transaction(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf cash_transactions Tabelle
CREATE TRIGGER trigger_automatic_cash_withdrawal
  AFTER UPDATE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_cash_withdrawal();

-- 15. Kommentare für die neuen Funktionen
COMMENT ON TABLE cash_balances IS 'Kassenstände der Fahrlehrer';
COMMENT ON TABLE cash_movements IS 'Audit-Trail für alle Kassenbewegungen';
COMMENT ON FUNCTION top_up_cash_balance IS 'Stockt die Kasse eines Fahrlehrers auf (nur für Admins)';
COMMENT ON FUNCTION withdraw_cash_transaction IS 'Zieht den Betrag einer Bargeldtransaktion von der Kasse ab';
COMMENT ON FUNCTION trigger_cash_withdrawal IS 'Trigger für automatische Kassenabzüge bei bestätigten Bargeldtransaktionen';
