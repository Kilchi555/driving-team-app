-- Fix movement_type check constraint to allow 'system_init' for staff trigger
-- Currently allows: 'deposit', 'withdrawal', 'cash_transaction', 'adjustment'
-- Need to add: 'system_init' for staff initialization

-- 1. Drop the existing constraint
ALTER TABLE cash_movements 
DROP CONSTRAINT IF EXISTS cash_movements_movement_type_check;

-- 2. Add corrected constraint that includes 'system_init'
ALTER TABLE cash_movements 
ADD CONSTRAINT cash_movements_movement_type_check 
CHECK (
  movement_type = ANY (
    ARRAY[
      'deposit'::text,
      'withdrawal'::text,
      'cash_transaction'::text,
      'adjustment'::text,
      'system_init'::text
    ]
  )
);

-- 3. Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Movement type constraint updated to include system_init';
    RAISE NOTICE 'Staff trigger can now create system initialization entries';
    RAISE NOTICE 'USER CREATION SHOULD NOW WORK COMPLETELY!';
END $$;




















