-- Migration: Student Credit System
-- Erstellt die Tabellen für das Guthaben-Management

-- 1. Student Credits Tabelle (Haupttabelle für Guthaben)
CREATE TABLE IF NOT EXISTS student_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  balance_rappen INTEGER NOT NULL DEFAULT 0, -- Guthaben in Rappen (CHF * 100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 2. Credit Transactions Tabelle (Historie aller Guthaben-Änderungen)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'appointment_payment', 'refund', 'cancellation'
  amount_rappen INTEGER NOT NULL, -- Positive für Einzahlungen, negative für Auszahlungen
  balance_before_rappen INTEGER NOT NULL, -- Guthaben vor der Transaktion
  balance_after_rappen INTEGER NOT NULL, -- Guthaben nach der Transaktion
  payment_method VARCHAR(50), -- 'cash', 'online', 'invoice', 'credit'
  reference_id UUID, -- Referenz auf appointment, invoice, etc.
  reference_type VARCHAR(50), -- 'appointment', 'invoice', 'manual'
  created_by UUID REFERENCES users(id), -- Wer hat die Transaktion erstellt
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 3. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_student_credits_user_id ON student_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_id, reference_type);

-- 4. RLS Policies (Row Level Security)
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy für student_credits: Benutzer können ihr eigenes Guthaben sehen
CREATE POLICY "Users can view their own credits" ON student_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy für student_credits: Staff können Guthaben ihrer Schüler sehen
CREATE POLICY "Staff can view their students credits" ON student_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = student_credits.user_id 
      AND users.assigned_staff_id = auth.uid()
    )
  );

-- Policy für student_credits: Admins können alle Guthaben sehen
CREATE POLICY "Admins can view all credits" ON student_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy für student_credits: Staff können Guthaben ihrer Schüler bearbeiten
CREATE POLICY "Staff can manage their students credits" ON student_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = student_credits.user_id 
      AND users.assigned_staff_id = auth.uid()
    )
  );

-- Policy für student_credits: Admins können alle Guthaben bearbeiten
CREATE POLICY "Admins can manage all credits" ON student_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy für credit_transactions: Benutzer können ihre eigenen Transaktionen sehen
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy für credit_transactions: Staff können Transaktionen ihrer Schüler sehen
CREATE POLICY "Staff can view their students credit transactions" ON credit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = credit_transactions.user_id 
      AND users.assigned_staff_id = auth.uid()
    )
  );

-- Policy für credit_transactions: Admins können alle Transaktionen sehen
CREATE POLICY "Admins can view all credit transactions" ON credit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy für credit_transactions: Staff können Transaktionen für ihre Schüler erstellen
CREATE POLICY "Staff can create credit transactions for their students" ON credit_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = credit_transactions.user_id 
      AND users.assigned_staff_id = auth.uid()
    )
  );

-- Policy für credit_transactions: Admins können alle Transaktionen erstellen
CREATE POLICY "Admins can create all credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Trigger für automatische Aktualisierung des updated_at Feldes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_credits_updated_at 
  BEFORE UPDATE ON student_credits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Funktion für automatische Guthaben-Erstellung bei neuen Schülern
CREATE OR REPLACE FUNCTION create_student_credit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO student_credits (user_id, balance_rappen, notes)
  VALUES (NEW.id, 0, 'Automatisch erstellt bei Schüler-Registrierung');
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für automatische Guthaben-Erstellung
CREATE TRIGGER create_student_credit_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION create_student_credit();

-- 7. Kommentare für bessere Dokumentation
COMMENT ON TABLE student_credits IS 'Guthaben der Schüler für Vorauszahlungen';
COMMENT ON TABLE credit_transactions IS 'Historie aller Guthaben-Transaktionen';
COMMENT ON COLUMN student_credits.balance_rappen IS 'Guthaben in Rappen (CHF * 100)';
COMMENT ON COLUMN credit_transactions.amount_rappen IS 'Betrag in Rappen (positiv für Einzahlungen, negativ für Auszahlungen)';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'Art der Transaktion: deposit, withdrawal, appointment_payment, refund, cancellation';
COMMENT ON COLUMN credit_transactions.reference_type IS 'Typ der Referenz: appointment, invoice, manual';
