-- Fix RLS policies for customer_payment_methods table to allow webhook writes

-- Enable RLS if not already enabled
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment methods" ON customer_payment_methods;
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON customer_payment_methods;
DROP POLICY IF EXISTS "Service role can manage all payment methods" ON customer_payment_methods;

-- Create policy for authenticated users to view their own payment methods
CREATE POLICY "Users can view their own payment methods"
  ON customer_payment_methods
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

-- Create policy for authenticated users to manage their own payment methods
CREATE POLICY "Users can manage their own payment methods"
  ON customer_payment_methods
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own payment methods"
  ON customer_payment_methods
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Create policy for service role (webhooks) to manage all payment methods
CREATE POLICY "Service role can manage all payment methods"
  ON customer_payment_methods
  FOR ALL
  USING (true)
  WITH CHECK (true);

