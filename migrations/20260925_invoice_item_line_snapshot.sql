-- Immutable invoice-line snapshot.
-- Existing rows are left NULL. Do not backfill from appointments.

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS event_type_code text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS staff_id uuid,
  ADD COLUMN IF NOT EXISTS staff_first_name text,
  ADD COLUMN IF NOT EXISTS customer_first_name text,
  ADD COLUMN IF NOT EXISTS customer_last_name text;

COMMENT ON COLUMN invoice_items.event_type_code IS
  'Event type code frozen when the line was created. Not recomputed from appointments.';

COMMENT ON COLUMN invoice_items.user_id IS
  'Customer/student id frozen when the line was created. Not recomputed from appointments.';

COMMENT ON COLUMN invoice_items.staff_id IS
  'Staff/instructor id frozen when the line was created. Not recomputed from appointments.';

COMMENT ON COLUMN invoice_items.staff_first_name IS
  'Staff first name frozen when the line was created. Not updated when the user is renamed.';

COMMENT ON COLUMN invoice_items.customer_first_name IS
  'Customer first name frozen when the line was created. Not updated when the user is renamed.';

COMMENT ON COLUMN invoice_items.customer_last_name IS
  'Customer last name frozen when the line was created. Not updated when the user is renamed.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_user_id_fkey'
  ) THEN
    ALTER TABLE invoice_items
      ADD CONSTRAINT invoice_items_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_staff_id_fkey'
  ) THEN
    ALTER TABLE invoice_items
      ADD CONSTRAINT invoice_items_staff_id_fkey
      FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
