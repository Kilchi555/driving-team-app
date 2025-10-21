-- Optional: Add UNIQUE constraints to users table for phone and email
-- This prevents duplicates at the database level
-- NOTE: Run this AFTER ensuring there are no existing duplicates!

-- Step 1: Check for existing duplicates before adding constraints
DO $$
DECLARE
  phone_duplicates INTEGER;
  email_duplicates INTEGER;
BEGIN
  -- Check for phone duplicates within same tenant
  SELECT COUNT(*) INTO phone_duplicates
  FROM (
    SELECT phone, tenant_id, COUNT(*) as cnt
    FROM users
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone, tenant_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  -- Check for email duplicates within same tenant  
  SELECT COUNT(*) INTO email_duplicates
  FROM (
    SELECT email, tenant_id, COUNT(*) as cnt
    FROM users
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email, tenant_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  RAISE NOTICE 'Found % phone duplicates and % email duplicates', phone_duplicates, email_duplicates;
  
  IF phone_duplicates > 0 OR email_duplicates > 0 THEN
    RAISE EXCEPTION 'Cannot add UNIQUE constraints - duplicates exist! Please clean up duplicates first.';
  END IF;
END $$;

-- Step 2: Add UNIQUE constraints (phone + tenant_id combination)
-- This allows same phone across different tenants, but not within same tenant
ALTER TABLE users 
  ADD CONSTRAINT users_phone_tenant_unique 
  UNIQUE (phone, tenant_id);

-- Step 3: Add UNIQUE constraints (email + tenant_id combination)
-- This allows same email across different tenants, but not within same tenant
ALTER TABLE users 
  ADD CONSTRAINT users_email_tenant_unique 
  UNIQUE (email, tenant_id);

-- Step 4: Verify constraints were added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  a.attname AS column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.conrelid = 'users'::regclass
  AND c.contype = 'u'
  AND c.conname LIKE 'users_%_tenant_unique'
ORDER BY conname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ UNIQUE constraints added successfully!';
  RAISE NOTICE 'Phone and email are now unique per tenant';
END $$;

