# SQL Queries to find and fix missing payments

## 1. Find all appointments without payments

```sql
SELECT 
  COUNT(*) as total_appointments_without_payments,
  COUNT(DISTINCT user_id) as affected_customers
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL
  AND a.deleted_at IS NULL
  AND a.status NOT IN ('cancelled', 'aborted');
```

## 2. Details of appointments without payments

```sql
SELECT 
  a.id,
  a.user_id,
  u.email,
  a.title,
  a.type,
  a.start_time,
  a.created_at,
  a.status
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
LEFT JOIN users u ON a.user_id = u.id
WHERE p.id IS NULL
  AND a.deleted_at IS NULL
  AND a.status NOT IN ('cancelled', 'aborted')
ORDER BY a.created_at DESC;
```

## 3. Run the migration

Execute the SQL file: `migrations/fix_all_missing_payments.sql`

This will create payment records for all appointments without payments.

## 4. Verify the fix

```sql
SELECT COUNT(*) as remaining_without_payments
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL;
```

Should return: 0

