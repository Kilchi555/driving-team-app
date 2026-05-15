-- Add driving-school specific vehicle detail columns to vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS marke      TEXT,
  ADD COLUMN IF NOT EXISTS modell     TEXT,
  ADD COLUMN IF NOT EXISTS getriebe   TEXT,
  ADD COLUMN IF NOT EXISTS aufbau     TEXT,
  ADD COLUMN IF NOT EXISTS farbe      TEXT;

COMMENT ON COLUMN public.vehicles.marke    IS 'Fahrzeugmarke (z.B. VW, Audi)';
COMMENT ON COLUMN public.vehicles.modell   IS 'Fahrzeugmodell (z.B. Golf, A3)';
COMMENT ON COLUMN public.vehicles.getriebe IS 'Getriebetyp (Schaltgetriebe / Automatik)';
COMMENT ON COLUMN public.vehicles.aufbau   IS 'Karosserieform (z.B. Limousine, Kombi)';
COMMENT ON COLUMN public.vehicles.farbe    IS 'Fahrzeugfarbe';
