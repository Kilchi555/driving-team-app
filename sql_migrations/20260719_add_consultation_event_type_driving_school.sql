-- Adds the missing 'consultation' (Beratung) event_type template for
-- driving_school. The admin dashboard (pages/admin/categories.vue) has long
-- supported a per-category "Beratung" price (rule_type='consultation',
-- already used by 10 real tenants), but no template event_type row ever
-- existed for driving_school, so it never appeared in the tenant
-- registration pricing step (GET /api/tenants/template-event-types sources
-- its list from event_types templates).
--
-- Template-only (tenant_id IS NULL) — does not touch any existing tenant
-- data. New tenants pick this up automatically via
-- server/utils/business-type-presets.ts (applyCategoryAndEventTypeDefaults),
-- which copies all event_types templates matching business_type.

INSERT INTO event_types (
  id, code, name, emoji, description, default_duration_minutes,
  default_color, is_active, display_order, allowed_roles,
  requires_team_invite, auto_generate_title, tenant_id,
  require_payment, public_bookable, is_default, business_type
)
SELECT
  gen_random_uuid(), 'consultation', 'Beratung', '💬', 'Beratungsgespräch', 30,
  '#f59e0b', true, 0, ARRAY['staff','admin'],
  false, true, NULL,
  true, true, false, 'driving_school'
WHERE NOT EXISTS (
  SELECT 1 FROM event_types
  WHERE tenant_id IS NULL AND business_type = 'driving_school' AND code = 'consultation'
);
