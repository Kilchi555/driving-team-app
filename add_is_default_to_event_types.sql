-- Add is_default column to event_types table
-- This allows marking one event type as default for appointment creation

ALTER TABLE event_types
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_types_is_default 
ON event_types(tenant_id, is_default) 
WHERE is_default = true;

-- Add constraint to ensure only one default per tenant (optional, but recommended)
-- Note: PostgreSQL doesn't support filtered unique constraints directly, 
-- so we use a partial unique index instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_types_one_default_per_tenant
ON event_types(tenant_id)
WHERE is_default = true;

-- Add comment
COMMENT ON COLUMN event_types.is_default IS 'Marks this event type as the default for appointment creation';

