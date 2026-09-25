-- Immutable invoice-line snapshot.
-- Existing rows are left NULL. Do not backfill from appointments.

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS event_type_code text,
  ADD COLUMN IF NOT EXISTS user_id uuid;

COMMENT ON COLUMN invoice_items.event_type_code IS
  'Event type code frozen when the line was created. Not recomputed from appointments.';

COMMENT ON COLUMN invoice_items.user_id IS
  'Student/client frozen when the line was created. Not recomputed from appointments.';

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
