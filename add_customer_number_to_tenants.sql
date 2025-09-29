-- Add customer number field to tenants table
-- This adds a unique customer_number column with SM-XXX-XXX format

ALTER TABLE tenants 
ADD COLUMN customer_number VARCHAR(10) UNIQUE;

-- Add comment for documentation
COMMENT ON COLUMN tenants.customer_number IS 'Unique customer number in format SM-XXX-XXX (e.g., SM-000-001)';

-- Create index for better performance on lookups
CREATE INDEX idx_tenants_customer_number ON tenants(customer_number);

-- Optional: Add a function to generate the next customer number
CREATE OR REPLACE FUNCTION generate_next_customer_number()
RETURNS VARCHAR(10) AS $$
DECLARE
    next_number INTEGER;
    customer_num VARCHAR(10);
BEGIN
    -- Get the highest existing number
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 4 FOR 3) AS INTEGER)), 0) + 1
    INTO next_number
    FROM tenants 
    WHERE customer_number IS NOT NULL 
    AND customer_number ~ '^SM-[0-9]{3}-[0-9]{3}$';
    
    -- Format as SM-XXX-XXX
    customer_num := 'SM-' || LPAD(next_number::TEXT, 3, '0') || '-001';
    
    RETURN customer_num;
END;
$$ LANGUAGE plpgsql;
