-- Cleanup: Merge duplicate devices for the same user
-- This script finds devices with the same user_id and similar user_agent
-- and merges them into a single device record

-- 1. Find duplicate devices (same user + similar browser)
-- 2. Keep the most recent one (with latest last_seen)
-- 3. Delete the others

DO $$
DECLARE
  device_record RECORD;
  duplicate_record RECORD;
  merged_id UUID;
  duplicates_to_delete UUID[];
BEGIN
  -- Loop through all users
  FOR device_record IN 
    SELECT DISTINCT user_id, 
           CASE 
             WHEN user_agent ILIKE '%Chrome%' THEN 'Chrome'
             WHEN user_agent ILIKE '%Firefox%' THEN 'Firefox'
             WHEN user_agent ILIKE '%Safari%' THEN 'Safari'
             WHEN user_agent ILIKE '%Edge%' THEN 'Edge'
             ELSE 'Unknown'
           END as browser_type
    FROM user_devices
  LOOP
    -- Find all devices for this user with the same browser type
    FOR duplicate_record IN
      SELECT id, last_seen, first_seen, is_trusted, user_agent
      FROM user_devices
      WHERE user_id = device_record.user_id
        AND CASE 
              WHEN user_agent ILIKE '%Chrome%' THEN 'Chrome'
              WHEN user_agent ILIKE '%Firefox%' THEN 'Firefox'
              WHEN user_agent ILIKE '%Safari%' THEN 'Safari'
              WHEN user_agent ILIKE '%Edge%' THEN 'Edge'
              ELSE 'Unknown'
            END = device_record.browser_type
      ORDER BY last_seen DESC
    LOOP
      -- First device = keep (most recent)
      IF merged_id IS NULL THEN
        merged_id := duplicate_record.id;
        
        -- Update the kept device with earliest first_seen if needed
        UPDATE user_devices
        SET first_seen = LEAST(first_seen, duplicate_record.first_seen)
        WHERE id = merged_id;
        
        -- If any duplicate was trusted, mark the kept one as trusted
        IF duplicate_record.is_trusted THEN
          UPDATE user_devices
          SET is_trusted = true
          WHERE id = merged_id;
        END IF;
        
        RAISE NOTICE 'Keeping device % for user % (most recent)', merged_id, device_record.user_id;
      ELSE
        -- This is a duplicate - mark for deletion
        duplicates_to_delete := array_append(duplicates_to_delete, duplicate_record.id);
        RAISE NOTICE 'Marking device % for deletion (duplicate of %)', duplicate_record.id, merged_id;
      END IF;
    END LOOP;
    
    -- Delete duplicates
    IF array_length(duplicates_to_delete, 1) > 0 THEN
      DELETE FROM user_devices
      WHERE id = ANY(duplicates_to_delete);
      
      RAISE NOTICE 'Deleted % duplicate devices for user %', array_length(duplicates_to_delete, 1), device_record.user_id;
    END IF;
    
    -- Reset for next user
    merged_id := NULL;
    duplicates_to_delete := NULL;
  END LOOP;
END $$;

-- Verify cleanup
SELECT 
  user_id,
  COUNT(*) as device_count,
  string_agg(DISTINCT device_name, ', ') as device_names
FROM user_devices
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY device_count DESC;

