-- Hard delete all payments for user 30824de7-8fb1-49d8-9f2f-fa2eebb873db
-- WARNING: This will permanently delete all payment records for this user

-- Step 1: Delete discount_sales records (if they exist for these appointments)
DELETE FROM discount_sales
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Step 2: Delete product_sales records (if they exist for these appointments)
DELETE FROM product_sales
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Step 3: Delete payments records
DELETE FROM payments 
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Verify deletion
SELECT COUNT(*) as remaining_payments
FROM payments p
INNER JOIN appointments a ON p.appointment_id = a.id
WHERE a.user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';
