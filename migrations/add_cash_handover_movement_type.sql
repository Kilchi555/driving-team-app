-- Add cash_handover to cash_movements movement_type check constraint
-- This represents a physical cash handover from a staff member to the driving school

ALTER TABLE public.cash_movements
  DROP CONSTRAINT cash_movements_movement_type_check;

ALTER TABLE public.cash_movements
  ADD CONSTRAINT cash_movements_movement_type_check
    CHECK (movement_type = ANY (ARRAY[
      'deposit'::text,
      'withdrawal'::text,
      'cash_transaction'::text,
      'adjustment'::text,
      'system_init'::text,
      'cash_handover'::text
    ]));
