-- Fix RLS Policies for student_credits table
-- This will allow authenticated users to read and write student credits

-- Enable RLS on student_credits table
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON student_credits;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON student_credits
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON student_credits
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON student_credits
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON student_credits
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix credit_transactions table
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON credit_transactions;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON credit_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON credit_transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON credit_transactions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON credit_transactions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Verify the tables exist and have the right structure
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('student_credits', 'credit_transactions')
ORDER BY table_name, ordinal_position;
