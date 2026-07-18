-- Adds template rows (tenant_id IS NULL) for business_type = 'mental_coach'.
-- Until now, categories/event_types/evaluation_categories templates only
-- existed for 'driving_school'. Since tenant-register.vue already offers
-- "Coaching" (mental_coach) as a signup option, and register.post.ts filters
-- template copying by business_type, a mental_coach signup silently ended up
-- with zero categories and zero event types.
--
-- Content mirrors the starter set already authored in
-- server/api/tenants/seed-defaults.post.ts (defaultsByType.mental_coach),
-- which was written for this business type but never wired into the actual
-- registration flow.
--
-- This only inserts template rows (tenant_id IS NULL). No existing tenant
-- data is touched.

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
VALUES
  ('stress', 'Stress', 'Umgang mit Stress und Belastung', '#7C3AED', true, 'mental_coach', NULL),
  ('focus',  'Fokus',  'Konzentration und Fokus im Alltag', '#0EA5E9', true, 'mental_coach', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
VALUES
  ('intake',  'Erstgespräch', '🤝', 'Kostenloses Erstgespräch', 30, '#0EA5E9', true, 0, ARRAY['staff','admin'], false, true,  true,  'mental_coach', NULL),
  ('session', 'Sitzung',      '🧠', 'Reguläre Coaching-Sitzung', 60, '#7C3AED', true, 1, ARRAY['staff','admin'], true,  true,  false, 'mental_coach', NULL),
  ('package', 'Paket',        '📦', 'Sitzungspaket',             60, '#10B981', true, 2, ARRAY['staff','admin'], true,  false, false, 'mental_coach', NULL)
ON CONFLICT DO NOTHING;
