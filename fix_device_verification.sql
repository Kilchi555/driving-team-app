-- Temporärer Fix: Alle Geräte als verifiziert und trusted markieren
-- Damit Device Verification den Login nicht mehr blockiert

UPDATE user_devices
SET 
  verified_at = COALESCE(verified_at, NOW()),
  is_trusted = true,
  verification_token = NULL
WHERE verified_at IS NULL OR is_trusted = false;

-- Zeige Ergebnis
SELECT 
  id,
  user_id,
  device_name,
  verified_at,
  is_trusted,
  last_seen_at
FROM user_devices
ORDER BY last_seen_at DESC;

