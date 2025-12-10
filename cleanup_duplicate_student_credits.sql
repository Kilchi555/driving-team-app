-- Cleanup duplicate student_credits entries
-- Issue: Multiple rows returned when expecting single row

-- ============================================
-- 1. Find duplicates
-- ============================================
SELECT 
  user_id,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at DESC) as ids,
  array_agg(balance_rappen ORDER BY created_at DESC) as balances,
  array_agg(created_at ORDER BY created_at DESC) as dates
FROM student_credits
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================
-- 2. Merge duplicates (keep most recent, sum balances)
-- ============================================
DO $$
DECLARE
  dup_record RECORD;
  keep_id UUID;
  total_balance INTEGER;
BEGIN
  -- Loop through each user with duplicates
  FOR dup_record IN 
    SELECT 
      user_id,
      array_agg(id ORDER BY created_at DESC) as ids,
      array_agg(balance_rappen ORDER BY created_at DESC) as balances
    FROM student_credits
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recent record (first in sorted array)
    keep_id := dup_record.ids[1];
    
    -- Sum all balances
    SELECT SUM(balance_rappen) INTO total_balance
    FROM student_credits
    WHERE user_id = dup_record.user_id;
    
    RAISE NOTICE 'User: %, Keeping ID: %, Total Balance: %', 
      dup_record.user_id, keep_id, total_balance;
    
    -- Update the kept record with total balance
    UPDATE student_credits
    SET 
      balance_rappen = total_balance,
      updated_at = NOW()
    WHERE id = keep_id;
    
    -- Delete all other duplicates
    DELETE FROM student_credits
    WHERE user_id = dup_record.user_id
    AND id != keep_id;
    
  END LOOP;
END $$;

-- ============================================
-- 3. Verify no more duplicates
-- ============================================
SELECT 
  user_id,
  COUNT(*) as count
FROM student_credits
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Should return 0 rows

-- ============================================
-- 4. Add unique constraint to prevent future duplicates
-- ============================================
-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_credits_user_id_unique'
  ) THEN
    ALTER TABLE student_credits 
    ADD CONSTRAINT student_credits_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE 'Unique constraint added successfully';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- ============================================
-- 5. Final verification
-- ============================================
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM student_credits;

-- total_records should equal unique_users

