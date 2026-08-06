-- Create business_types and business_type_presets tables

create table if not exists public.business_types (
  code text primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create table if not exists public.business_type_presets (
  id uuid primary key default gen_random_uuid(),
  business_type_code text not null references public.business_types(code) on delete cascade,
  feature_flags jsonb not null default '{}'::jsonb,
  ui_labels jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

-- Basic seed for initial types
insert into public.business_types (code, name, description) values
  ('driving_school', 'Fahrschule', 'Standard Fahrschule'),
  ('mental_coach', 'Mental-Coaching', 'Coaching & Beratung'),
  ('consulting', 'Consulting', 'Beratung & Consulting (z.B. IT, Strategie, Projekte)')
on conflict (code) do nothing;

-- Seed minimal presets (feature flags + labels).
-- ui_labels mirrors the Terminology interface in composables/useTerminology.ts
-- (client, staff, appointment, categoriesLabel, businessNoun, ...) plus
-- label_event_type_header, which is read separately by EventTypeSelector.vue.
-- See sql_migrations/20260729_align_business_type_ui_labels.sql for the
-- migration that brought existing rows in line with this schema.
insert into public.business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
values
  (
    'driving_school',
    '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": false, "product_sales_enabled": false}',
    '{"client":"Benutzer","clientsPlural":"Benutzer","clientPossessive":"Benutzer","staff":"Fahrlehrer","staffPlural":"Fahrlehrer","appointment":"Fahrstunde","appointmentsPlural":"Fahrstunden","bookAction":"Fahrstunde buchen","categoriesLabel":"Kategorien","categoryLabel":"Kategorie","businessNoun":"Fahrschule","label_event_type_header":"Terminart"}',
    '{"working_days_template":{"days":[1,2,3,4,5,6],"start_time":"07:00","end_time":"19:00","schedule":{"1":{"start":"07:00","end":"19:00"},"2":{"start":"07:00","end":"19:00"},"3":{"start":"07:00","end":"19:00"},"4":{"start":"07:00","end":"19:00"},"5":{"start":"07:00","end":"19:00"},"6":{"start":"08:00","end":"16:00"}}}}'
  ),
  (
    'mental_coach',
    '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}',
    '{"client":"Kunde","clientsPlural":"Kunden","clientPossessive":"Kunde","staff":"Coach","staffPlural":"Coaches","appointment":"Sitzung","appointmentsPlural":"Sitzungen","bookAction":"Sitzung buchen","categoriesLabel":"Themenbereiche","categoryLabel":"Themenbereich","businessNoun":"Coaching-Praxis","label_event_type_header":"Sitzungsart"}',
    '{"working_days_template":{"days":[1,2,3,4,5],"start_time":"08:00","end_time":"18:00","schedule":{"1":{"start":"08:00","end":"18:00"},"2":{"start":"08:00","end":"18:00"},"3":{"start":"08:00","end":"18:00"},"4":{"start":"08:00","end":"18:00"},"5":{"start":"08:00","end":"18:00"}}}}'
  ),
  (
    'consulting',
    '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}',
    '{"client":"Kunde","clientsPlural":"Kunden","clientPossessive":"Kunde","staff":"Berater","staffPlural":"Berater","appointment":"Beratung","appointmentsPlural":"Beratungen","bookAction":"Beratung buchen","categoriesLabel":"Leistungsbereiche","categoryLabel":"Leistungsbereich","businessNoun":"Consulting-Unternehmen","label_event_type_header":"Terminart"}',
    '{"working_days_template":{"days":[1,2,3,4,5],"start_time":"09:00","end_time":"17:00","schedule":{"1":{"start":"09:00","end":"17:00"},"2":{"start":"09:00","end":"17:00"},"3":{"start":"09:00","end":"17:00"},"4":{"start":"09:00","end":"17:00"},"5":{"start":"09:00","end":"17:00"}}}}'
  )
on conflict do nothing;


