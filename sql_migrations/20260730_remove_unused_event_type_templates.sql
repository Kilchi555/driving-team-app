-- Trim starter event types: mental_coach no longer ships 'package';
-- consulting no longer ships 'workshop' / 'project'. Template-only
-- (tenant_id IS NULL) — existing tenant rows are left untouched.

DELETE FROM pricing_rules
WHERE tenant_id IS NULL
  AND (
    (business_type = 'mental_coach' AND event_type_code = 'package')
    OR (business_type = 'consulting' AND event_type_code IN ('workshop', 'project'))
  );

DELETE FROM event_types
WHERE tenant_id IS NULL
  AND (
    (business_type = 'mental_coach' AND code = 'package')
    OR (business_type = 'consulting' AND code IN ('workshop', 'project'))
  );
