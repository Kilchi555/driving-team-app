-- Migration: Device Verification für unbekannte Geräte
-- Fügt verification_token und verified_at Felder zur user_devices Tabelle hinzu

-- 1. Erweitere user_devices Tabelle
ALTER TABLE user_devices 
ADD COLUMN IF NOT EXISTS verification_token UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Erstelle Index für schnelle Token-Suche
CREATE INDEX IF NOT EXISTS idx_user_devices_verification_token 
ON user_devices(verification_token) 
WHERE verification_token IS NOT NULL;

-- 3. Kommentare für Dokumentation
COMMENT ON COLUMN user_devices.verification_token IS 'Token für Magic Link Verifikation bei unbekanntem Gerät';
COMMENT ON COLUMN user_devices.verified_at IS 'Zeitpunkt der erfolgreichen Geräte-Verifikation';
COMMENT ON COLUMN user_devices.verification_expires_at IS 'Ablaufzeitpunkt des Verifikations-Tokens (24h)';

-- 4. Setze verified_at für bereits bestehende Geräte (als trusted markiert)
UPDATE user_devices
SET verified_at = first_seen
WHERE is_trusted = true AND verified_at IS NULL;

