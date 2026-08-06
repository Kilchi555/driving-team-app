-- Prefer "Kunde/Kunden" over "Klient/Klienten" for coaching/mental_coach presets.

UPDATE business_type_presets
SET
  ui_labels = ui_labels
    || '{"client":"Kunde","clientsPlural":"Kunden","clientPossessive":"Kunde"}'::jsonb,
  updated_at = now()
WHERE business_type_code IN ('mental_coach', 'coaching');
