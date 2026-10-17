-- PR #467 company-credit preflight. READ ONLY.
-- A person runs this by hand on a database they choose.
-- This file was not executed while it was written.
--
-- One SELECT. No INSERT, UPDATE, DELETE, DDL, function, trigger, grant, or policy.
-- Aggregate counts and catalog text only. No names, emails, or payment references.
-- If a table or column is absent, the row says missing_schema_prerequisite.
-- A permission error means that fact is not established. It does not mean the count is zero.
--
-- Result columns: section, check_name, status, detail

WITH expected_table AS (
  SELECT expected_name
  FROM (
    VALUES
      ('invoices'),
      ('companies'),
      ('users'),
      ('student_credits'),
      ('credit_transactions'),
      ('invoice_payments'),
      ('payments')
  ) AS names(expected_name)
),
focus_column AS (
  SELECT table_name, column_name
  FROM (
    VALUES
      ('invoices', 'user_id'),
      ('invoices', 'tenant_id'),
      ('invoices', 'company_id'),
      ('invoices', 'bill_to_kind'),
      ('invoices', 'bill_to_company_id'),
      ('invoices', 'billing_type'),
      ('invoices', 'paid_amount_rappen'),
      ('companies', 'id'),
      ('companies', 'tenant_id'),
      ('companies', 'is_active'),
      ('users', 'id'),
      ('users', 'tenant_id'),
      ('users', 'company_id'),
      ('users', 'auth_user_id'),
      ('users', 'role'),
      ('student_credits', 'user_id'),
      ('student_credits', 'tenant_id'),
      ('student_credits', 'balance_rappen'),
      ('credit_transactions', 'user_id'),
      ('credit_transactions', 'tenant_id'),
      ('credit_transactions', 'idempotency_key'),
      ('invoice_payments', 'invoice_id'),
      ('invoice_payments', 'tenant_id'),
      ('invoice_payments', 'amount_rappen'),
      ('invoice_payments', 'idempotency_key'),
      ('invoice_payments', 'status'),
      ('payments', 'user_id'),
      ('payments', 'tenant_id'),
      ('payments', 'invoice_id'),
      ('payments', 'idempotency_key')
  ) AS focus(table_name, column_name)
),
cols AS (
  SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name IN (SELECT expected_name FROM expected_table)
),
table_presence AS (
  SELECT
    'table_presence'::text AS section,
    expected_name AS check_name,
    CASE
      WHEN to_regclass('public.' || expected_name) IS NULL THEN 'missing_schema_prerequisite'
      ELSE 'present'
    END AS status,
    ('public.' || expected_name) AS detail
  FROM expected_table
),
focus_presence AS (
  SELECT
    'focus_column'::text AS section,
    f.table_name || '.' || f.column_name AS check_name,
    CASE
      WHEN to_regclass('public.' || f.table_name) IS NULL THEN 'missing_schema_prerequisite'
      WHEN c.column_name IS NULL THEN 'missing_schema_prerequisite'
      ELSE 'present'
    END AS status,
    CASE
      WHEN to_regclass('public.' || f.table_name) IS NULL THEN 'table_absent'
      WHEN c.column_name IS NULL THEN 'column_absent'
      ELSE c.is_nullable || '|' || c.data_type || '|' || coalesce(c.column_default, 'no_default')
    END AS detail
  FROM focus_column AS f
  LEFT JOIN cols AS c
    ON c.table_name = f.table_name
   AND c.column_name = f.column_name
),
column_inventory AS (
  SELECT
    'column_inventory'::text AS section,
    c.table_name || '.' || c.column_name AS check_name,
    'present'::text AS status,
    c.is_nullable || '|' || c.data_type || '|' || coalesce(c.column_default, 'no_default') AS detail
  FROM cols AS c
),
constraints AS (
  SELECT
    'constraint'::text AS section,
    t.relname || '.' || c.conname AS check_name,
    CASE c.contype
      WHEN 'p' THEN 'primary_key'
      WHEN 'u' THEN 'unique'
      WHEN 'f' THEN 'foreign_key'
      WHEN 'c' THEN 'check'
      ELSE c.contype::text
    END AS status,
    pg_get_constraintdef(c.oid) AS detail
  FROM pg_constraint AS c
  JOIN pg_class AS t ON t.oid = c.conrelid
  JOIN pg_namespace AS n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname IN (SELECT expected_name FROM expected_table)
),
indexes AS (
  SELECT
    'index'::text AS section,
    t.relname || '.' || ic.relname AS check_name,
    CASE WHEN i.indisunique THEN 'unique_index' ELSE 'index' END AS status,
    pg_get_indexdef(i.indexrelid) AS detail
  FROM pg_index AS i
  JOIN pg_class AS t ON t.oid = i.indrelid
  JOIN pg_class AS ic ON ic.oid = i.indexrelid
  JOIN pg_namespace AS n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname IN (SELECT expected_name FROM expected_table)
    AND (
      i.indisunique
      OR pg_get_indexdef(i.indexrelid) ILIKE '%idempotency%'
      OR pg_get_indexdef(i.indexrelid) ILIKE '%dedupe%'
    )
),
idempotency_columns AS (
  SELECT
    'idempotency_column'::text AS section,
    c.table_name || '.' || c.column_name AS check_name,
    'present'::text AS status,
    c.is_nullable || '|' || c.data_type AS detail
  FROM cols AS c
  WHERE c.column_name ILIKE '%idempotency%'
     OR c.column_name ILIKE '%dedupe%'
),
null_user_groups AS (
  SELECT
    'aggregate'::text AS section,
    'invoices_user_id_null_groups'::text AS check_name,
    CASE
      WHEN to_regclass('public.invoices') IS NULL THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (
        SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'user_id'
      ) THEN 'missing_schema_prerequisite'
      ELSE 'ok'
    END AS status,
    CASE
      WHEN to_regclass('public.invoices') IS NULL THEN 'public.invoices'
      WHEN NOT EXISTS (
        SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'user_id'
      ) THEN 'invoices.user_id'
      ELSE (
        SELECT coalesce(string_agg(line, E'\n' ORDER BY line), 'no_matching_rows')
        FROM (
          SELECT (xpath('//line/text()', row_xml))[1]::text AS line
          FROM unnest(
            xpath(
              '//row',
              query_to_xml(
                format(
                  $fmt$
                  SELECT concat_ws(
                    '|',
                    g1,
                    g2,
                    g3,
                    g4,
                    count(*)::text
                  ) AS line
                  FROM (
                    SELECT
                      %s AS g1,
                      %s AS g2,
                      %s AS g3,
                      %s AS g4
                    FROM public.invoices
                    WHERE user_id IS NULL
                  ) AS grouped
                  GROUP BY g1, g2, g3, g4
                  ORDER BY g1, g2, g3, g4
                  $fmt$,
                  CASE
                    WHEN EXISTS (
                      SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'billing_type'
                    ) THEN 'CASE WHEN billing_type IN (''individual'', ''company'') THEN billing_type WHEN billing_type IS NULL THEN ''billing_type_null'' ELSE ''billing_type_other'' END'
                    ELSE '''billing_type_column_absent'''
                  END,
                  CASE
                    WHEN EXISTS (
                      SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'company_id'
                    ) THEN 'CASE WHEN company_id IS NULL THEN ''company_id_null'' ELSE ''company_id_present'' END'
                    ELSE '''company_id_column_absent'''
                  END,
                  CASE
                    WHEN EXISTS (
                      SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'bill_to_kind'
                    ) THEN 'CASE WHEN bill_to_kind IN (''user'', ''company'') THEN bill_to_kind WHEN bill_to_kind IS NULL THEN ''bill_to_kind_null'' ELSE ''bill_to_kind_other'' END'
                    ELSE '''bill_to_kind_column_absent'''
                  END,
                  CASE
                    WHEN EXISTS (
                      SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'tenant_id'
                    ) THEN 'CASE WHEN tenant_id IS NULL THEN ''tenant_id_null'' ELSE ''tenant_id_present'' END'
                    ELSE '''tenant_id_column_absent'''
                  END
                ),
                false,
                true,
                ''
              )
            )
          ) AS row_xml
        ) AS lines
      )
    END AS detail
),
company_invoice_links AS (
  SELECT
    'aggregate'::text AS section,
    'company_linked_invoice_relationships'::text AS check_name,
    CASE
      WHEN to_regclass('public.invoices') IS NULL THEN 'missing_schema_prerequisite'
      WHEN to_regclass('public.companies') IS NULL THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'company_id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'tenant_id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'tenant_id') THEN 'missing_schema_prerequisite'
      ELSE 'ok'
    END AS status,
    CASE
      WHEN to_regclass('public.invoices') IS NULL THEN 'public.invoices'
      WHEN to_regclass('public.companies') IS NULL THEN 'public.companies'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'company_id') THEN 'invoices.company_id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'invoices' AND column_name = 'tenant_id') THEN 'invoices.tenant_id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'id') THEN 'companies.id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'tenant_id') THEN 'companies.tenant_id'
      ELSE (
        SELECT coalesce((xpath('//line/text()', query_to_xml(
          $count$
          SELECT concat_ws(
            '|',
            'company_linked=' || count(*) FILTER (WHERE i.company_id IS NOT NULL)::text,
            'missing_company_row=' || count(*) FILTER (WHERE i.company_id IS NOT NULL AND c.id IS NULL)::text,
            'tenant_mismatch=' || count(*) FILTER (WHERE i.company_id IS NOT NULL AND c.id IS NOT NULL AND i.tenant_id IS DISTINCT FROM c.tenant_id)::text,
            'invoice_tenant_null=' || count(*) FILTER (WHERE i.company_id IS NOT NULL AND i.tenant_id IS NULL)::text
          ) AS line
          FROM public.invoices AS i
          LEFT JOIN public.companies AS c ON c.id = i.company_id
          $count$,
          false,
          true,
          ''
        )))[1]::text, 'no_matching_rows')
      )
    END AS detail
),
user_company_links AS (
  SELECT
    'aggregate'::text AS section,
    'user_company_tenant_relationships'::text AS check_name,
    CASE
      WHEN to_regclass('public.users') IS NULL THEN 'missing_schema_prerequisite'
      WHEN to_regclass('public.companies') IS NULL THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'company_id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'tenant_id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'tenant_id') THEN 'missing_schema_prerequisite'
      ELSE 'ok'
    END AS status,
    CASE
      WHEN to_regclass('public.users') IS NULL THEN 'public.users'
      WHEN to_regclass('public.companies') IS NULL THEN 'public.companies'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'company_id') THEN 'users.company_id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'tenant_id') THEN 'users.tenant_id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'id') THEN 'companies.id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'companies' AND column_name = 'tenant_id') THEN 'companies.tenant_id'
      ELSE (
        SELECT coalesce((xpath('//line/text()', query_to_xml(
          $count$
          SELECT concat_ws(
            '|',
            'users_with_company=' || count(*) FILTER (WHERE u.company_id IS NOT NULL)::text,
            'missing_company_row=' || count(*) FILTER (WHERE u.company_id IS NOT NULL AND c.id IS NULL)::text,
            'tenant_mismatch=' || count(*) FILTER (WHERE u.company_id IS NOT NULL AND c.id IS NOT NULL AND u.tenant_id IS DISTINCT FROM c.tenant_id)::text
          ) AS line
          FROM public.users AS u
          LEFT JOIN public.companies AS c ON c.id = u.company_id
          $count$,
          false,
          true,
          ''
        )))[1]::text, 'no_matching_rows')
      )
    END AS detail
),
personal_credit_links AS (
  SELECT
    'aggregate'::text AS section,
    'student_credit_user_tenant_relationships'::text AS check_name,
    CASE
      WHEN to_regclass('public.student_credits') IS NULL THEN 'missing_schema_prerequisite'
      WHEN to_regclass('public.users') IS NULL THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'student_credits' AND column_name = 'user_id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'student_credits' AND column_name = 'tenant_id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'id') THEN 'missing_schema_prerequisite'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'tenant_id') THEN 'missing_schema_prerequisite'
      ELSE 'ok'
    END AS status,
    CASE
      WHEN to_regclass('public.student_credits') IS NULL THEN 'public.student_credits'
      WHEN to_regclass('public.users') IS NULL THEN 'public.users'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'student_credits' AND column_name = 'user_id') THEN 'student_credits.user_id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'student_credits' AND column_name = 'tenant_id') THEN 'student_credits.tenant_id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'id') THEN 'users.id'
      WHEN NOT EXISTS (SELECT 1 FROM cols WHERE table_name = 'users' AND column_name = 'tenant_id') THEN 'users.tenant_id'
      ELSE (
        SELECT coalesce((xpath('//line/text()', query_to_xml(
          $count$
          SELECT concat_ws(
            '|',
            'credit_rows=' || count(*)::text,
            'missing_user=' || count(*) FILTER (WHERE u.id IS NULL)::text,
            'tenant_mismatch=' || count(*) FILTER (WHERE u.id IS NOT NULL AND sc.tenant_id IS DISTINCT FROM u.tenant_id)::text
          ) AS line
          FROM public.student_credits AS sc
          LEFT JOIN public.users AS u ON u.id = sc.user_id
          $count$,
          false,
          true,
          ''
        )))[1]::text, 'no_matching_rows')
      )
    END AS detail
)
SELECT section, check_name, status, detail FROM table_presence
UNION ALL
SELECT section, check_name, status, detail FROM focus_presence
UNION ALL
SELECT section, check_name, status, detail FROM column_inventory
UNION ALL
SELECT section, check_name, status, detail FROM constraints
UNION ALL
SELECT section, check_name, status, detail FROM indexes
UNION ALL
SELECT section, check_name, status, detail FROM idempotency_columns
UNION ALL
SELECT section, check_name, status, detail FROM null_user_groups
UNION ALL
SELECT section, check_name, status, detail FROM company_invoice_links
UNION ALL
SELECT section, check_name, status, detail FROM user_company_links
UNION ALL
SELECT section, check_name, status, detail FROM personal_credit_links
ORDER BY section, check_name, detail;
