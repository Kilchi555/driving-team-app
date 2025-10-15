-- Add generated text columns for JSONB search and indexes

-- imported_customers: add raw_text generated from raw_json
alter table if exists imported_customers
  add column if not exists raw_text text generated always as (raw_json::text) stored;

-- imported_invoices: add raw_text generated from raw_json
alter table if exists imported_invoices
  add column if not exists raw_text text generated always as (raw_json::text) stored;

-- Simple btree indexes to speed up ILIKE queries
create index if not exists idx_imported_customers_raw_text on imported_customers (raw_text);
create index if not exists idx_imported_invoices_raw_text on imported_invoices (raw_text);

-- Optional: full-text index (commented). Enable if you later use to_tsvector search
-- create index if not exists idx_imported_customers_raw_text_tsv on imported_customers using gin (to_tsvector('simple', raw_text));
-- create index if not exists idx_imported_invoices_raw_text_tsv on imported_invoices using gin (to_tsvector('simple', raw_text));


