-- Diagnostic: Understand why these payments have invalid Wallee transaction IDs

SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.payment_method,
  p.created_at,
  p.updated_at,
  p.metadata,
  p.description,
  p.appointment_id,
  p.user_id,
  p.tenant_id,
  -- Check if there's anything in transaction history
  (SELECT STRING_AGG(pwt.wallee_transaction_id, ', ')
   FROM payment_wallee_transactions pwt WHERE pwt.payment_id = p.id) as historical_transaction_ids,
  -- Check appointment status
  (SELECT a.status FROM appointments a WHERE a.id = p.appointment_id) as appointment_status
FROM payments p
WHERE p.id IN (
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54',
  '0f0acba5-7a8a-4c44-a02c-f8c2538f0d36',
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '62acedcb-40bc-40f7-9ae6-dc31d4b319cb',
  '99f4ee32-5fb9-43b0-84e3-2f8ed0c05c37',
  '9f295b22-cdf5-44b3-8781-754788285221',
  '27ff5c0d-d5d4-4c20-a4eb-47a5e5b6c5a0',
  'e1056d02-3911-4bac-a13d-9bee661e1d0c',
  'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
);
