-- Store branch-specific default working hours in business_type_presets.defaults.
-- Used when creating a new tenant (tenants.working_days_template) and as a
-- fallback during staff registration when a tenant has no template yet.
--
-- Shape matches tenants.working_days_template:
--   { days: number[], start_time, end_time, schedule: { [day]: { start, end } } }

UPDATE business_type_presets
SET defaults = coalesce(defaults, '{}'::jsonb) || '{
  "working_days_template": {
    "days": [1, 2, 3, 4, 5, 6],
    "start_time": "07:00",
    "end_time": "19:00",
    "schedule": {
      "1": { "start": "07:00", "end": "19:00" },
      "2": { "start": "07:00", "end": "19:00" },
      "3": { "start": "07:00", "end": "19:00" },
      "4": { "start": "07:00", "end": "19:00" },
      "5": { "start": "07:00", "end": "19:00" },
      "6": { "start": "08:00", "end": "16:00" }
    }
  }
}'::jsonb,
updated_at = now()
WHERE business_type_code = 'driving_school';

UPDATE business_type_presets
SET defaults = coalesce(defaults, '{}'::jsonb) || '{
  "working_days_template": {
    "days": [1, 2, 3, 4, 5],
    "start_time": "08:00",
    "end_time": "18:00",
    "schedule": {
      "1": { "start": "08:00", "end": "18:00" },
      "2": { "start": "08:00", "end": "18:00" },
      "3": { "start": "08:00", "end": "18:00" },
      "4": { "start": "08:00", "end": "18:00" },
      "5": { "start": "08:00", "end": "18:00" }
    }
  }
}'::jsonb,
updated_at = now()
WHERE business_type_code = 'mental_coach';

UPDATE business_type_presets
SET defaults = coalesce(defaults, '{}'::jsonb) || '{
  "working_days_template": {
    "days": [1, 2, 3, 4, 5],
    "start_time": "09:00",
    "end_time": "17:00",
    "schedule": {
      "1": { "start": "09:00", "end": "17:00" },
      "2": { "start": "09:00", "end": "17:00" },
      "3": { "start": "09:00", "end": "17:00" },
      "4": { "start": "09:00", "end": "17:00" },
      "5": { "start": "09:00", "end": "17:00" }
    }
  }
}'::jsonb,
updated_at = now()
WHERE business_type_code = 'consulting';
