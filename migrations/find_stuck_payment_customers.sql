-- Find customer details for stuck payments
SELECT 
  p.created_at as payment_created_at,
  COALESCE(u.first_name, p.metadata->>'firstname', 'N/A') as first_name,
  COALESCE(u.last_name, p.metadata->>'lastname', 'N/A') as last_name,
  COALESCE(u.email, p.metadata->>'email', 'N/A') as email,
  u.phone,
  -- Appointment/Termin info
  a.start_time::text as termin_start,
  a.status as appointment_status,
  p.total_amount_rappen / 100.0 as amount_chf,
  p.payment_status,
  p.wallee_transaction_id,
  p.description,
  t.name as tenant_name,
  p.id as payment_id
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE p.id IN (
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54',
  '0f0acba5-7a8a-4c44-a02c-f8c2538f0d36',
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '62acedcb-40bc-40f7-9ae6-dc31d4b319cb',
  '99f4ee32-5fb9-43b0-84e3-2f8ed0c05c37',
  '9f295b22-cdf5-44b3-8781-754788285221',
  'b3110c8c-8ef7-4c23-b1f1-b02f8cec72b9',
  'e1056d02-3911-4bac-a13d-9bee661e1d0c',
  'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
)
ORDER BY a.start_time DESC NULLS LAST, p.created_at DESC;
