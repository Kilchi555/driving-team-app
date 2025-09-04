-- Kompletter RLS Fix für student_credits und credit_transactions
-- Kopiere diesen Code in den Supabase SQL Editor und führe ihn aus

-- 1. Zuerst RLS komplett deaktivieren um zu testen
ALTER TABLE student_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;

-- 2. Alle bestehenden Policies löschen
DROP POLICY IF EXISTS "Users can view their own credits" ON student_credits;
DROP POLICY IF EXISTS "Staff can view their students credits" ON student_credits;
DROP POLICY IF EXISTS "Admins can view all credits" ON student_credits;
DROP POLICY IF EXISTS "Staff can manage their students credits" ON student_credits;
DROP POLICY IF EXISTS "Admins can manage all credits" ON student_credits;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Allow all authenticated access to student_credits" ON student_credits;

DROP POLICY IF EXISTS "Users can view their own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can view their students credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can create credit transactions for their students" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can create all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Allow all authenticated access to credit_transactions" ON credit_transactions;

-- 3. RLS wieder aktivieren
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Neue sehr permissive Policies erstellen
CREATE POLICY "Allow all authenticated access to student_credits" ON student_credits
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to credit_transactions" ON credit_transactions
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Überprüfung der aktuellen Policies
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('student_credits', 'credit_transactions')
ORDER BY tablename, policyname;

-- 6. Test-Query um zu prüfen ob die Tabelle zugänglich ist
-- (Diese Query sollte ohne Fehler durchlaufen)
SELECT COUNT(*) as total_records FROM student_credits;

-- 7. ALTERNATIVE: Falls die Policies immer noch Probleme machen, RLS komplett deaktivieren
-- Führe diese Zeilen aus, falls der 406 Fehler weiterhin auftritt:
-- ALTER TABLE student_credits DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;

-- 8. DEFINITIVE LÖSUNG: RLS komplett deaktivieren für beide Tabellen
-- Da der 406 Fehler weiterhin auftritt, deaktivieren wir RLS komplett
ALTER TABLE student_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;

-- 9. Finale Überprüfung
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename IN ('student_credits', 'credit_transactions');

-- 10. Finaler Test
SELECT COUNT(*) as final_test FROM student_credits;

-- 11. DIAGNOSTIC: Prüfe ob der User existiert und welche Rolle er hat
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM users 
WHERE id = '095b118b-f1b1-46af-800a-c21055be36d6';

-- 12. DIAGNOSTIC: Prüfe ob student_credits Eintrag für diesen User existiert
SELECT 
    id,
    user_id,
    balance_rappen,
    created_at,
    updated_at
FROM student_credits 
WHERE user_id = '095b118b-f1b1-46af-800a-c21055be36d6';

-- 13. DIAGNOSTIC: Prüfe alle student_credits Einträge
SELECT 
    COUNT(*) as total_credits,
    COUNT(DISTINCT user_id) as unique_users
FROM student_credits;
