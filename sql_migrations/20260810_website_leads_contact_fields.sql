-- website_leads: support contact form fields used by premium tenant websites
alter table public.website_leads
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists message text,
  add column if not exists status text not null default 'new';

comment on column public.website_leads.message is 'Optional message from tenant website contact form';
comment on column public.website_leads.status is 'new | contacted | closed';
