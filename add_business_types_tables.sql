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
  ('mental_coach', 'Mental-Coaching', 'Coaching & Beratung')
on conflict (code) do nothing;

-- Seed minimal presets (feature flags + labels)
insert into public.business_type_presets (business_type_code, feature_flags, ui_labels)
values
  (
    'driving_school',
    '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": false, "product_sales_enabled": false}',
    '{"term_lesson":"Fahrstunde","term_exam":"Prüfung","term_category":"Kategorie","label_event_type_header":"Terminart"}'
  ),
  (
    'mental_coach',
    '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}',
    '{"term_lesson":"Sitzung","term_exam":"Erstgespräch","term_category":"Themenbereich","label_event_type_header":"Sitzungsart"}'
  )
on conflict do nothing;


