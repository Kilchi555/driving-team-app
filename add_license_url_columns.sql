-- Add license URL columns to users table for file upload functionality

-- 1. Add the missing license URL columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS lernfahrausweis_back_url TEXT;

-- Note: lernfahrausweis_url already exists, we just need the back URL

-- 2. Verify the columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lernfahrausweis_url') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lernfahrausweis_back_url') THEN
        RAISE NOTICE 'License URL columns added successfully';
        RAISE NOTICE 'Front: lernfahrausweis_url';
        RAISE NOTICE 'Back: lernfahrausweis_back_url';
        RAISE NOTICE 'File upload functionality should now work';
    ELSE
        RAISE NOTICE 'License URL columns missing';
    END IF;
END $$;



