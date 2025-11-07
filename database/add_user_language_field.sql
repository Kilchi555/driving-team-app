-- Add language field to users table for i18n support
-- Default: 'de' (German), supports: de, en, sq, it, es, fr, hr, sr, bs, tr, ru

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'de' NOT NULL;

COMMENT ON COLUMN public.users.language IS 'User preferred language for i18n (ISO 639-1 codes: de, en, sq, it, es, fr, hr, sr, bs, tr, ru)';

-- Add constraint to ensure valid language codes
ALTER TABLE public.users
ADD CONSTRAINT users_language_check 
CHECK (language IN ('de', 'en', 'sq', 'it', 'es', 'fr', 'hr', 'sr', 'bs', 'tr', 'ru'));

-- Update existing users to default language 'de' if null
UPDATE public.users
SET language = 'de'
WHERE language IS NULL;

