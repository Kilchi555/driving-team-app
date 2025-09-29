-- Fix unique constraint for external_busy_times to allow multiple events per calendar
DO $$ BEGIN
  -- Drop incorrect unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'external_busy_times' AND c.conname = 'external_busy_times_tenant_id_staff_id_external_calendar_id_key'
  ) THEN
    ALTER TABLE external_busy_times
      DROP CONSTRAINT external_busy_times_tenant_id_staff_id_external_calendar_id_key;
  END IF;
END $$;

-- Create correct composite unique constraint to avoid duplicates but allow multiple events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'external_busy_times' AND c.conname = 'external_busy_times_unique_event_key'
  ) THEN
    ALTER TABLE external_busy_times
      ADD CONSTRAINT external_busy_times_unique_event_key
      UNIQUE (tenant_id, staff_id, external_calendar_id, external_event_id, start_time);
  END IF;
END $$;

-- Optional index for query performance
CREATE INDEX IF NOT EXISTS idx_external_busy_times_event
  ON external_busy_times(tenant_id, staff_id, external_calendar_id, start_time);


