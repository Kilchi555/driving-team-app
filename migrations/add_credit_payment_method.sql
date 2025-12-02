-- Migration: Add 'credit' as valid payment method
-- Date: 2025-12-02
-- Description: When a payment is fully covered by student credit, 
-- payment_method should be set to 'credit' instead of 'wallee'

-- Update payment_method column documentation
-- The payment_method column now supports:
-- - 'wallee': Online payment (Wallee)
-- - 'invoice': Invoice payment
-- - 'cash': Cash payment
-- - 'credit': Payment made with student credit balance
-- - 'bank_transfer': Bank transfer
-- - 'twint': TWINT payment

-- No schema changes needed - payment_method is already VARCHAR and allows any string
-- This migration is purely for documentation and to flag that 'credit' is now a valid value

-- Note: When credit_used_rappen >= total_amount_rappen, payment_method should be set to 'credit'
-- and payment_status should be set to 'completed'

