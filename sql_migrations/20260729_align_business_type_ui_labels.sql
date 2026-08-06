-- Aligns business_type_presets.ui_labels with the Terminology schema used by
-- composables/useTerminology.ts (client, staff, appointment, categoriesLabel,
-- businessNoun, ...), so the tenant-register.vue registration flow (and later
-- any authenticated-tenant page reading from tenant_settings) can source its
-- wording from the DB instead of only the hardcoded TS fallback.
--
-- Replaces the old, unused ad-hoc keys (term_lesson/term_exam/term_category —
-- confirmed unused anywhere in the app) while preserving label_event_type_header,
-- which IS actively read by components/EventTypeSelector.vue via useUILabels().

UPDATE business_type_presets
SET ui_labels = '{
  "client": "Benutzer",
  "clientsPlural": "Benutzer",
  "clientPossessive": "Benutzer",
  "staff": "Fahrlehrer",
  "staffPlural": "Fahrlehrer",
  "appointment": "Fahrstunde",
  "appointmentsPlural": "Fahrstunden",
  "bookAction": "Fahrstunde buchen",
  "categoriesLabel": "Kategorien",
  "categoryLabel": "Kategorie",
  "businessNoun": "Fahrschule",
  "label_event_type_header": "Terminart"
}'::jsonb,
updated_at = now()
WHERE business_type_code = 'driving_school';

UPDATE business_type_presets
SET ui_labels = '{
  "client": "Kunde",
  "clientsPlural": "Kunden",
  "clientPossessive": "Kunde",
  "staff": "Coach",
  "staffPlural": "Coaches",
  "appointment": "Sitzung",
  "appointmentsPlural": "Sitzungen",
  "bookAction": "Sitzung buchen",
  "categoriesLabel": "Themenbereiche",
  "categoryLabel": "Themenbereich",
  "businessNoun": "Coaching-Praxis",
  "label_event_type_header": "Sitzungsart"
}'::jsonb,
updated_at = now()
WHERE business_type_code = 'mental_coach';

UPDATE business_type_presets
SET ui_labels = '{
  "client": "Kunde",
  "clientsPlural": "Kunden",
  "clientPossessive": "Kunde",
  "staff": "Berater",
  "staffPlural": "Berater",
  "appointment": "Beratung",
  "appointmentsPlural": "Beratungen",
  "bookAction": "Beratung buchen",
  "categoriesLabel": "Leistungsbereiche",
  "categoryLabel": "Leistungsbereich",
  "businessNoun": "Consulting-Unternehmen",
  "label_event_type_header": "Terminart"
}'::jsonb,
updated_at = now()
WHERE business_type_code = 'consulting';
