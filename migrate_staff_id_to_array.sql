-- Migration: Convert staff_id to staff_ids (JSONB array)
-- STATUS: ✅ COMPLETED
-- The staff_id column has already been migrated to staff_ids and dropped.
-- This file is kept for reference only.

-- Final state verification:
SELECT id, name, staff_ids, tenant_id FROM locations LIMIT 5;
