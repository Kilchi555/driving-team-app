-- Database Migration: Create appointment_discounts table
-- This ensures discounts are properly stored in their own table
-- Date: 2025-01-27

-- Create appointment_discounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointment_discounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discount_amount_rappen INTEGER NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
    discount_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_discounts_appointment_id ON appointment_discounts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_discounts_user_id ON appointment_discounts(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_discounts_staff_id ON appointment_discounts(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointment_discounts_created_at ON appointment_discounts(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE appointment_discounts ENABLE ROW LEVEL SECURITY;

-- Policy for staff to see discounts for their appointments
CREATE POLICY "Staff can view discounts for their appointments" ON appointment_discounts
    FOR SELECT USING (
        staff_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.id = appointment_discounts.appointment_id 
            AND a.staff_id = auth.uid()
        )
    );

-- Policy for staff to insert/update discounts for their appointments
CREATE POLICY "Staff can manage discounts for their appointments" ON appointment_discounts
    FOR ALL USING (
        staff_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.id = appointment_discounts.appointment_id 
            AND a.staff_id = auth.uid()
        )
    );

-- Policy for admins to see all discounts
CREATE POLICY "Admins can view all discounts" ON appointment_discounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- Policy for admins to manage all discounts
CREATE POLICY "Admins can manage all discounts" ON appointment_discounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointment_discounts_updated_at 
    BEFORE UPDATE ON appointment_discounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON appointment_discounts TO authenticated;

-- Insert sample data if table is empty (optional)
-- INSERT INTO appointment_discounts (appointment_id, user_id, staff_id, discount_amount_rappen, discount_type, discount_reason)
-- SELECT 
--     a.id as appointment_id,
--     a.user_id,
--     a.staff_id,
--     1000 as discount_amount_rappen, -- 10 CHF
--     'fixed' as discount_type,
--     'Sample discount' as discount_reason
-- FROM appointments a
-- WHERE a.id NOT IN (SELECT DISTINCT appointment_id FROM appointment_discounts)
-- LIMIT 5;

COMMENT ON TABLE appointment_discounts IS 'Stores discounts applied to appointments';
COMMENT ON COLUMN appointment_discounts.discount_amount_rappen IS 'Discount amount in Rappen (1 CHF = 100 Rappen)';
COMMENT ON COLUMN appointment_discounts.discount_type IS 'Type of discount: fixed (CHF) or percentage (%)';
COMMENT ON COLUMN appointment_discounts.discount_reason IS 'Reason for applying the discount';
