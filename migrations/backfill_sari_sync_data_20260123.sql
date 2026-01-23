-- Migration: Backfill course_registrations with SARI data from course_participants
-- Purpose: Fill in personal data and SARI info for existing SARI-synced registrations
-- Date: 2026-01-23
-- This is a data backfill for TIER 1 SARI sync enhancements

BEGIN;

-- Step 1: Update personal data from course_participants
UPDATE course_registrations cr
SET 
  first_name = COALESCE(cr.first_name, cp.first_name),
  last_name = COALESCE(cr.last_name, cp.last_name),
  street = COALESCE(cr.street, cp.street),
  zip = COALESCE(cr.zip, cp.zip),
  city = COALESCE(cr.city, cp.city),
  sari_faberid = COALESCE(cr.sari_faberid, cp.faberid),
  updated_at = NOW()
FROM course_participants cp
WHERE cr.participant_id = cp.id
  AND cr.tenant_id = cp.tenant_id
  AND cr.sari_synced = true
  AND (cr.first_name IS NULL OR cr.first_name = 'Unbekannt' OR cr.last_name IS NULL OR cr.last_name = 'Unbekannt');

-- Step 2: Update notes to include migration info for records we updated
UPDATE course_registrations cr
SET 
  notes = CASE 
    WHEN notes IS NULL THEN 'Data backfilled from course_participants on 2026-01-23'
    ELSE notes || ' | Data backfilled from course_participants on 2026-01-23'
  END,
  updated_at = NOW()
WHERE cr.sari_synced = true
  AND cr.participant_id IS NOT NULL
  AND (cr.first_name IS NOT NULL AND cr.first_name != 'Unbekannt')
  AND (cr.notes IS NULL OR cr.notes NOT LIKE '%backfilled%');

-- Verify results
SELECT 
  COUNT(*) as total_registrations,
  COUNT(CASE WHEN first_name IS NOT NULL AND first_name != 'Unbekannt' THEN 1 END) as with_first_name,
  COUNT(CASE WHEN last_name IS NOT NULL AND last_name != 'Unbekannt' THEN 1 END) as with_last_name,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
  COUNT(CASE WHEN sari_faberid IS NOT NULL THEN 1 END) as with_sari_faberid
FROM course_registrations
WHERE sari_synced = true;

COMMIT;

