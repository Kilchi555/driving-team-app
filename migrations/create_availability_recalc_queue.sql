-- Create availability recalculation queue table
-- This table tracks which staff members need their availability slots recalculated

CREATE TABLE IF NOT EXISTS availability_recalc_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL CHECK (trigger IN ('working_hours', 'external_event', 'appointment', 'appointment_edit', 'appointment_cancelled')),
  queued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: only one pending recalc per staff (staff_id + tenant_id only, ignoring processed status)
  UNIQUE(staff_id, tenant_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_recalc_queue_processed ON availability_recalc_queue(processed, queued_at);
CREATE INDEX IF NOT EXISTS idx_recalc_queue_staff_tenant ON availability_recalc_queue(staff_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_recalc_queue_tenant ON availability_recalc_queue(tenant_id);

-- Enable RLS
ALTER TABLE availability_recalc_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies: Only admin and service role can see this
CREATE POLICY "Allow service role full access" ON availability_recalc_queue
  AS PERMISSIVE FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_recalc_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalc_queue_updated_at
BEFORE UPDATE ON availability_recalc_queue
FOR EACH ROW
EXECUTE FUNCTION update_recalc_queue_timestamp();
