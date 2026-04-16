-- Migration: Neue Felder für Staff-Registrierung
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS instructor_since_year  INTEGER,      -- Jahr seit dem die Person Fahrlehrer ist
  ADD COLUMN IF NOT EXISTS accepted_terms_at      TIMESTAMPTZ;  -- Zeitstempel AGB-Akzeptanz

COMMENT ON COLUMN users.instructor_since_year IS 'Jahr ab dem der Fahrlehrer tätig ist (z.B. 2015)';
COMMENT ON COLUMN users.accepted_terms_at     IS 'Zeitstempel, wann der User die AGB akzeptiert hat';
