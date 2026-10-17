-- PR #467 company-credit preflight. Read-only. Not an authorization to run it.
--
-- Execute one statement at a time, in the numbered order below. Do not wrap
-- this file in BEGIN or COMMIT. Do not execute it as one script. A later
-- error does not erase a result the client has already returned. An error,
-- including a missing relation or a permission error, is not a zero count
-- and is not status ok.
--
-- Statements 1-4 read catalogs only. They do not name application tables in
-- FROM or JOIN. Statements 5-12 are counts. Run a count only after statement
-- 2 reports status present for every column that count names, and statement
-- 2 reports status present for that table's row_visibility check. Skip
-- statement 12 unless invoices.bill_to_kind is present.
--
-- information_schema is not used. Absence means no matching pg_class or
-- pg_attribute row was visible for schema public. It does not mean a
-- privilege error. Privilege failures are status inconclusive.
--
-- A zero count is returned only with status ok. status ok is returned only
-- when the relation is an ordinary table, row security is disabled on that
-- relation, and SELECT on the relation and the named columns is granted.
-- Zero visible rows under row security are not proof of zero stored rows.
-- This file does not convert historical discrepancies into credit.
--
-- No INSERT, UPDATE, DELETE, MERGE, TRUNCATE, DDL, SET, SELECT INTO, lock,
-- or sequence call.

-- STATEMENT 1 of 12. Session. No application table.
SELECT 'session'::text AS section,
       'execution_contract'::text AS check_name,
       'present'::text AS status,
       'run_one_statement_at_a_time|no_begin|error_is_not_a_zero_count'::text AS detail
UNION ALL
SELECT 'session',
       'current_user',
       'present',
       current_user::text
UNION ALL
SELECT 'session',
       'rolbypassrls',
       CASE WHEN r.oid IS NULL THEN 'inconclusive' ELSE 'present' END,
       CASE
         WHEN r.oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         ELSE r.rolbypassrls::text
       END
FROM (SELECT 1) AS anchor
LEFT JOIN pg_roles AS r ON r.rolname = current_user
UNION ALL
SELECT 'session',
       'rolsuper',
       CASE WHEN r.oid IS NULL THEN 'inconclusive' ELSE 'present' END,
       CASE
         WHEN r.oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         ELSE r.rolsuper::text
       END
FROM (SELECT 1) AS anchor
LEFT JOIN pg_roles AS r ON r.rolname = current_user
UNION ALL
SELECT 'session',
       'row_security_setting',
       'present',
       current_setting('row_security')
UNION ALL
SELECT 'session',
       'search_path',
       'present',
       current_setting('search_path')
UNION ALL
SELECT 'session',
       'server_version',
       'present',
       current_setting('server_version');

-- STATEMENT 2 of 12. Tables, columns, and scope. Catalog only.
-- Lookups use pg_namespace.nspname = 'public', not search_path.
-- column detail not_null is pg_attribute.attnotnull. It is not a row count.
-- row_visibility present means relrowsecurity is false on an ordinary table
-- and table SELECT is granted. It is not a row count. Ownership, rolbypassrls,
-- rolsuper, and the row_security setting are reported and are not treated as
-- proof that row security would return every stored row.
WITH expected_table AS (
  SELECT table_name
  FROM (
    VALUES
      ('invoices'::text),
      ('companies'),
      ('users'),
      ('student_credits'),
      ('credit_transactions'),
      ('invoice_payments'),
      ('payments'),
      ('bank_import_records')
  ) AS v(table_name)
),
expected_column AS (
  SELECT table_name, column_name
  FROM (
    VALUES
      ('invoices'::text, 'id'::text),
      ('invoices', 'tenant_id'),
      ('invoices', 'user_id'),
      ('invoices', 'company_id'),
      ('invoices', 'billing_type'),
      ('invoices', 'bill_to_kind'),
      ('invoices', 'bill_to_company_id'),
      ('companies', 'id'),
      ('companies', 'tenant_id'),
      ('users', 'id'),
      ('users', 'tenant_id'),
      ('users', 'company_id'),
      ('student_credits', 'id'),
      ('student_credits', 'user_id'),
      ('student_credits', 'tenant_id'),
      ('credit_transactions', 'id'),
      ('credit_transactions', 'user_id'),
      ('credit_transactions', 'tenant_id'),
      ('credit_transactions', 'transaction_type'),
      ('credit_transactions', 'payment_method'),
      ('credit_transactions', 'reference_type'),
      ('credit_transactions', 'reference_id'),
      ('credit_transactions', 'description'),
      ('invoice_payments', 'id'),
      ('invoice_payments', 'tenant_id'),
      ('invoice_payments', 'idempotency_key'),
      ('payments', 'id'),
      ('payments', 'tenant_id'),
      ('payments', 'metadata'),
      ('bank_import_records', 'id'),
      ('bank_import_records', 'tenant_id'),
      ('bank_import_records', 'dedupe_key')
  ) AS v(table_name, column_name)
),
role_info AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
relations AS (
  SELECT
    e.table_name,
    c.oid,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity,
    c.relowner
  FROM expected_table AS e
  LEFT JOIN pg_namespace AS n ON n.nspname = 'public'
  LEFT JOIN pg_class AS c
    ON c.relnamespace = n.oid
   AND c.relname = e.table_name
   AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
)
SELECT 'table'::text AS section,
       rel.table_name AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'absent'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'inconclusive'
         ELSE 'present'
       END AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'absent_from_public'
         WHEN rel.relkind NOT IN ('r', 'p') THEN concat(
           'relation_kind_not_an_ordinary_or_partitioned_table|relkind=',
           rel.relkind
         )
         ELSE concat(
           'relkind=', rel.relkind,
           '|relrowsecurity=', rel.relrowsecurity,
           '|relforcerowsecurity=', rel.relforcerowsecurity,
           '|owner_is_current_user=',
           coalesce((rel.relowner = role.role_oid)::text, 'unknown'),
           '|select_privilege=',
           CASE
             WHEN has_table_privilege(rel.oid, 'SELECT') THEN 'true'
             ELSE 'false'
           END
         )
       END AS detail
FROM relations AS rel
LEFT JOIN role_info AS role ON true
UNION ALL
SELECT 'table',
       rel.table_name || '.row_visibility',
       CASE
         WHEN rel.oid IS NULL THEN 'absent'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN rel.relrowsecurity THEN 'inconclusive'
         WHEN has_table_privilege(rel.oid, 'SELECT') IS NOT TRUE THEN 'inconclusive'
         ELSE 'present'
       END,
       CASE
         WHEN rel.oid IS NULL THEN 'absent_from_public'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles|not_a_row_count'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established|not_a_row_count'
         WHEN rel.relrowsecurity THEN 'row_visibility_not_established|not_a_row_count'
         WHEN has_table_privilege(rel.oid, 'SELECT') IS NOT TRUE THEN 'select_privilege_not_established|not_a_row_count'
         ELSE 'rls_disabled|not_a_row_count'
       END
FROM relations AS rel
LEFT JOIN role_info AS role ON true
UNION ALL
SELECT 'column',
       ec.table_name || '.' || ec.column_name,
       CASE
         WHEN rel.oid IS NULL THEN 'absent'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'inconclusive'
         WHEN a.attnum IS NULL THEN 'absent'
         WHEN CASE
                WHEN a.attnum IS NULL THEN NULL::boolean
                ELSE has_column_privilege(rel.oid, a.attnum, 'SELECT')
              END IS NOT TRUE THEN 'inconclusive'
         ELSE 'present'
       END,
       CASE
         WHEN rel.oid IS NULL THEN 'parent_table_absent_from_public'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'relation_kind_not_an_ordinary_or_partitioned_table'
         WHEN a.attnum IS NULL THEN 'column_absent_from_pg_attribute'
         WHEN CASE
                WHEN a.attnum IS NULL THEN NULL::boolean
                ELSE has_column_privilege(rel.oid, a.attnum, 'SELECT')
              END IS NOT TRUE THEN concat(
           'select_privilege_not_established|not_null=',
           coalesce(a.attnotnull::text, 'unknown'),
           '|type=',
           coalesce(typ.typname, 'unknown')
         )
         ELSE concat(
           'not_null=', a.attnotnull,
           '|type=', coalesce(typ.typname, 'unknown')
         )
       END
FROM expected_column AS ec
LEFT JOIN relations AS rel ON rel.table_name = ec.table_name
LEFT JOIN pg_attribute AS a
  ON a.attrelid = rel.oid
 AND a.attname = ec.column_name
 AND a.attnum > 0
 AND NOT a.attisdropped
LEFT JOIN pg_type AS typ ON typ.oid = a.atttypid
UNION ALL
SELECT 'scope',
       'catalog_lookup',
       'present',
       'schema=public|information_schema_not_used|absence_is_not_a_privilege_error'
UNION ALL
SELECT 'scope',
       'payment_description_and_metadata_keys',
       'inconclusive',
       'not_inspected'
UNION ALL
SELECT 'scope',
       'historical_discrepancies',
       'present',
       'not_converted_by_this_script'
ORDER BY section, check_name;

-- STATEMENT 3 of 12. Indexes. Catalog only.
-- A named index is present only when its columns, uniqueness, and partial
-- flag match the repository shape recorded in this statement. Predicate text
-- is compared only for invoice_payments_idempotency_key_uidx, and only
-- against the spellings listed here. Any other predicate text is
-- inconclusive, not a match and not a mismatch. Live predicate text is not
-- selected. Description and metadata values are not read.
-- Repository shapes:
--   migrations/20261017_settlement_integrity_hardening.sql
--     invoice_payments_idempotency_key_uidx
--       UNIQUE (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL
--     credit_transactions_invoice_deposit_uidx
--       UNIQUE (tenant_id, reference_id) WHERE transaction_type = 'deposit'
--         AND reference_type = 'invoice' AND reference_id IS NOT NULL
--     credit_transactions_bulk_cash_overpay_uidx
--       UNIQUE (tenant_id, description) WHERE transaction_type = 'deposit'
--         AND payment_method = 'cash' AND reference_type = 'overpayment'
--         AND description LIKE 'bulk-cash-overpay:%'
--   migrations/20261005_staff_pos_deferred_overpay_idempotency.sql
--     credit_transactions_staff_pos_deferred_overpay_uidx
--       UNIQUE (tenant_id, description) WHERE transaction_type = 'deposit'
--         AND payment_method = 'cash' AND reference_type = 'overpayment'
--         AND description LIKE 'staff-pos-deferred-overpay:%'
--   sql_migrations/20260721_camt_import_dedup.sql
--   sql_migrations/20260721_bank_import_records_rename.sql
--     bank_import_records_tenant_id_dedupe_key_key
--       UNIQUE (tenant_id, dedupe_key)
-- The two description indexes are index objects only. Their coverage label
-- says description values are not read. bank_import_records is bank-import
-- dedupe, not company credit. The name check does not prove another index
-- of the same shape is absent; read the any_unique and any_partial rows.
WITH expected_index AS (
  SELECT *
  FROM (
    VALUES
      (
        'invoice_payments_idempotency_key_uidx'::text,
        'invoice_payments'::text,
        'tenant_id,idempotency_key'::text,
        true,
        '(idempotency_keyisnotnull)'::text,
        'idempotency_keyisnotnull'::text,
        'invoice_payment_idempotency'::text
      ),
      (
        'credit_transactions_invoice_deposit_uidx',
        'credit_transactions',
        'tenant_id,reference_id',
        true,
        '',
        '',
        'invoice_deposit_reference_not_company_credit'
      ),
      (
        'credit_transactions_bulk_cash_overpay_uidx',
        'credit_transactions',
        'tenant_id,description',
        true,
        '',
        '',
        'description_prefix_index_values_not_read'
      ),
      (
        'credit_transactions_staff_pos_deferred_overpay_uidx',
        'credit_transactions',
        'tenant_id,description',
        true,
        '',
        '',
        'description_prefix_index_values_not_read'
      ),
      (
        'bank_import_records_tenant_id_dedupe_key_key',
        'bank_import_records',
        'tenant_id,dedupe_key',
        false,
        '',
        '',
        'bank_import_dedupe_not_company_credit'
      )
  ) AS v(
    index_name,
    table_name,
    expected_cols,
    partial_expected,
    known_pred,
    known_pred_alt,
    coverage
  )
),
named_index AS (
  SELECT
    e.index_name,
    e.table_name,
    e.expected_cols,
    e.partial_expected,
    e.known_pred,
    e.known_pred_alt,
    e.coverage,
    t.oid AS table_oid,
    t.relkind,
    ic.oid AS named_oid,
    i.indexrelid,
    i.indisunique,
    i.indpred IS NOT NULL AS is_partial,
    CASE
      WHEN i.indpred IS NULL THEN ''
      ELSE lower(regexp_replace(pg_get_expr(i.indpred, i.indrelid), '[[:space:]]', '', 'g'))
    END AS pred_norm,
    colshape.cols AS actual_cols
  FROM expected_index AS e
  LEFT JOIN pg_namespace AS n ON n.nspname = 'public'
  LEFT JOIN pg_class AS t
    ON t.relnamespace = n.oid
   AND t.relname = e.table_name
   AND t.relkind IN ('r', 'p', 'v', 'm', 'f')
  LEFT JOIN pg_class AS ic
    ON ic.relnamespace = n.oid
   AND ic.relname = e.index_name
  LEFT JOIN pg_index AS i
    ON i.indexrelid = ic.oid
   AND i.indrelid = t.oid
  LEFT JOIN LATERAL (
    SELECT coalesce(string_agg(
      CASE
        WHEN u.attnum::smallint = 0 THEN 'expression'
        ELSE a.attname
      END,
      ',' ORDER BY u.ord
    ), '') AS cols
    FROM unnest(string_to_array(i.indkey::text, ' ')) WITH ORDINALITY AS u(attnum, ord)
    LEFT JOIN pg_attribute AS a
      ON a.attrelid = i.indrelid
     AND a.attnum = u.attnum::smallint
     AND a.attnum > 0
     AND NOT a.attisdropped
  ) AS colshape ON i.indexrelid IS NOT NULL
),
expected_shape AS (
  SELECT *
  FROM (
    VALUES
      (
        'invoice_payments.any_partial_unique_tenant_id_idempotency_key'::text,
        'invoice_payments'::text,
        'tenant_id,idempotency_key'::text,
        'tenant_id,idempotency_key'::text,
        true,
        'invoice_payment_idempotency'::text
      ),
      (
        'bank_import_records.any_unique_tenant_id_dedupe_key',
        'bank_import_records',
        'tenant_id,dedupe_key',
        'tenant_id,dedupe_key',
        false,
        'bank_import_dedupe_not_company_credit'
      ),
      (
        'student_credits.any_unique_user_id_tenant_id',
        'student_credits',
        'user_id,tenant_id',
        'tenant_id,user_id',
        false,
        'personal_credit_pair_either_column_order'
      ),
      (
        'student_credits.any_unique_user_id_only',
        'student_credits',
        'user_id',
        'user_id',
        false,
        'user_id_only_from_cleanup_script'
      )
  ) AS v(check_name, table_name, cols_a, cols_b, partial_expected, coverage)
),
shape_index AS (
  SELECT
    e.check_name,
    e.cols_a,
    e.cols_b,
    e.partial_expected,
    e.coverage,
    t.oid AS table_oid,
    t.relkind,
    i.indexrelid,
    i.indpred IS NOT NULL AS is_partial,
    colshape.cols AS actual_cols
  FROM expected_shape AS e
  LEFT JOIN pg_namespace AS n ON n.nspname = 'public'
  LEFT JOIN pg_class AS t
    ON t.relnamespace = n.oid
   AND t.relname = e.table_name
   AND t.relkind IN ('r', 'p', 'v', 'm', 'f')
  LEFT JOIN pg_index AS i
    ON i.indrelid = t.oid
   AND i.indisunique
  LEFT JOIN LATERAL (
    SELECT coalesce(string_agg(
      CASE
        WHEN u.attnum::smallint = 0 THEN 'expression'
        ELSE a.attname
      END,
      ',' ORDER BY u.ord
    ), '') AS cols
    FROM unnest(string_to_array(i.indkey::text, ' ')) WITH ORDINALITY AS u(attnum, ord)
    LEFT JOIN pg_attribute AS a
      ON a.attrelid = i.indrelid
     AND a.attnum = u.attnum::smallint
     AND a.attnum > 0
     AND NOT a.attisdropped
  ) AS colshape ON i.indexrelid IS NOT NULL
)
SELECT 'index'::text AS section,
       ni.index_name AS check_name,
       CASE
         WHEN ni.table_oid IS NULL THEN 'absent'
         WHEN ni.relkind NOT IN ('r', 'p') THEN 'inconclusive'
         WHEN ni.named_oid IS NULL THEN 'absent'
         WHEN ni.indexrelid IS NULL THEN 'definition_mismatch'
         WHEN ni.indisunique IS NOT TRUE
           OR ni.actual_cols IS DISTINCT FROM ni.expected_cols
           OR ni.is_partial IS DISTINCT FROM ni.partial_expected
           THEN 'definition_mismatch'
         WHEN ni.partial_expected
          AND (
            ni.known_pred = ''
            OR ni.pred_norm IS NULL
            OR ni.pred_norm = ''
            OR ni.pred_norm NOT IN (ni.known_pred, ni.known_pred_alt)
          ) THEN 'inconclusive'
         ELSE 'present'
       END AS status,
       CASE
         WHEN ni.table_oid IS NULL THEN 'parent_table_absent_from_public|coverage=' || ni.coverage
         WHEN ni.relkind NOT IN ('r', 'p') THEN 'relation_kind_not_an_ordinary_or_partitioned_table|coverage=' || ni.coverage
         WHEN ni.named_oid IS NULL THEN 'index_name_absent_from_public|coverage=' || ni.coverage
         WHEN ni.indexrelid IS NULL THEN 'index_name_not_on_expected_table|coverage=' || ni.coverage
         WHEN ni.indisunique IS NOT TRUE
           OR ni.actual_cols IS DISTINCT FROM ni.expected_cols
           OR ni.is_partial IS DISTINCT FROM ni.partial_expected
           THEN 'columns_or_uniqueness_or_partial_differ|actual_columns='
             || coalesce(ni.actual_cols, '')
             || '|coverage=' || ni.coverage
         WHEN ni.partial_expected
          AND (
            ni.known_pred = ''
            OR ni.pred_norm IS NULL
            OR ni.pred_norm = ''
            OR ni.pred_norm NOT IN (ni.known_pred, ni.known_pred_alt)
          ) THEN 'predicate_text_not_compared|actual_columns='
             || coalesce(ni.actual_cols, '')
             || '|coverage=' || ni.coverage
         ELSE 'matches_repository_shape|actual_columns='
           || coalesce(ni.actual_cols, '')
           || '|coverage=' || ni.coverage
       END AS detail
FROM named_index AS ni
UNION ALL
SELECT 'index',
       s.check_name,
       CASE
         WHEN bool_or(s.table_oid IS NULL) THEN 'absent'
         WHEN bool_or(s.relkind NOT IN ('r', 'p')) THEN 'inconclusive'
         WHEN count(*) FILTER (
           WHERE s.indexrelid IS NOT NULL
             AND s.actual_cols IN (s.cols_a, s.cols_b)
             AND s.is_partial IS NOT DISTINCT FROM s.partial_expected
         ) > 0 AND bool_or(s.partial_expected) THEN 'inconclusive'
         WHEN count(*) FILTER (
           WHERE s.indexrelid IS NOT NULL
             AND s.actual_cols IN (s.cols_a, s.cols_b)
             AND s.is_partial IS NOT DISTINCT FROM s.partial_expected
         ) > 0 THEN 'present'
         WHEN count(*) FILTER (
           WHERE s.indexrelid IS NOT NULL
             AND s.actual_cols IN (s.cols_a, s.cols_b)
             AND s.is_partial IS DISTINCT FROM s.partial_expected
         ) > 0 THEN 'inconclusive'
         ELSE 'absent'
       END,
       CASE
         WHEN bool_or(s.table_oid IS NULL) THEN 'parent_table_absent_from_public|coverage=' || min(s.coverage)
         WHEN bool_or(s.relkind NOT IN ('r', 'p')) THEN 'relation_kind_not_an_ordinary_or_partitioned_table|coverage=' || min(s.coverage)
         WHEN count(*) FILTER (
           WHERE s.indexrelid IS NOT NULL
             AND s.actual_cols IN (s.cols_a, s.cols_b)
             AND s.is_partial IS NOT DISTINCT FROM s.partial_expected
         ) > 0 AND bool_or(s.partial_expected) THEN 'predicate_text_not_compared|match_count='
           || count(*) FILTER (
             WHERE s.indexrelid IS NOT NULL
               AND s.actual_cols IN (s.cols_a, s.cols_b)
               AND s.is_partial IS NOT DISTINCT FROM s.partial_expected
           )::text
           || '|coverage=' || min(s.coverage)
         WHEN count(*) FILTER (
           WHERE s.indexrelid IS NOT NULL
             AND s.actual_cols IN (s.cols_a, s.cols_b)
             AND s.is_partial IS NOT DISTINCT FROM s.partial_expected
         ) > 0 THEN 'match_count='
           || count(*) FILTER (
             WHERE s.indexrelid IS NOT NULL
               AND s.actual_cols IN (s.cols_a, s.cols_b)
               AND s.is_partial IS NOT DISTINCT FROM s.partial_expected
           )::text
           || '|coverage=' || min(s.coverage)
         WHEN count(*) FILTER (
           WHERE s.indexrelid IS NOT NULL
             AND s.actual_cols IN (s.cols_a, s.cols_b)
             AND s.is_partial IS DISTINCT FROM s.partial_expected
         ) > 0 THEN 'partial_flag_differs|coverage=' || min(s.coverage)
         ELSE 'no_matching_unique_index_shape|coverage=' || min(s.coverage)
       END
FROM shape_index AS s
GROUP BY s.check_name, s.cols_a, s.cols_b, s.partial_expected, s.coverage
ORDER BY section, check_name;

-- STATEMENT 4 of 12. Primary keys, foreign keys, and check counts.
-- Catalog only. Check bodies are not selected. Foreign-key actions are the
-- confdeltype code mapped to a fixed word, not pg_get_constraintdef.
WITH expected_table AS (
  SELECT table_name
  FROM (
    VALUES
      ('invoices'::text),
      ('companies'),
      ('users'),
      ('student_credits'),
      ('credit_transactions'),
      ('invoice_payments'),
      ('payments'),
      ('bank_import_records')
  ) AS v(table_name)
),
relations AS (
  SELECT e.table_name, c.oid, c.relkind
  FROM expected_table AS e
  LEFT JOIN pg_namespace AS n ON n.nspname = 'public'
  LEFT JOIN pg_class AS c
    ON c.relnamespace = n.oid
   AND c.relname = e.table_name
   AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
)
SELECT 'constraint'::text AS section,
       rel.table_name || '.primary_key' AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'absent'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'inconclusive'
         WHEN pk.pk_count = 0 THEN 'absent'
         WHEN pk.pk_count = 1 THEN 'present'
         ELSE 'inconclusive'
       END AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'parent_table_absent_from_public'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'relation_kind_not_an_ordinary_or_partitioned_table'
         WHEN pk.pk_count = 0 THEN 'no_primary_key'
         WHEN pk.pk_count = 1 THEN 'columns=' || coalesce(pk.cols, '')
         ELSE 'primary_key_count=' || pk.pk_count::text
       END AS detail
FROM relations AS rel
LEFT JOIN LATERAL (
  SELECT
    count(DISTINCT i.indexrelid) AS pk_count,
    CASE
      WHEN count(DISTINCT i.indexrelid) = 1 THEN coalesce(string_agg(
        CASE
          WHEN u.attnum::smallint = 0 THEN 'expression'
          ELSE a.attname
        END,
        ',' ORDER BY u.ord
      ), '')
      ELSE ''
    END AS cols
  FROM pg_index AS i
  CROSS JOIN LATERAL unnest(string_to_array(i.indkey::text, ' ')) WITH ORDINALITY AS u(attnum, ord)
  LEFT JOIN pg_attribute AS a
    ON a.attrelid = i.indrelid
   AND a.attnum = u.attnum::smallint
   AND a.attnum > 0
   AND NOT a.attisdropped
  WHERE i.indrelid = rel.oid
    AND i.indisprimary
) AS pk ON true
UNION ALL
SELECT 'constraint',
       rel.table_name || '.foreign_key',
       CASE
         WHEN rel.oid IS NULL THEN 'absent'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'inconclusive'
         ELSE 'present'
       END,
       CASE
         WHEN rel.oid IS NULL THEN 'parent_table_absent_from_public'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'relation_kind_not_an_ordinary_or_partitioned_table'
         WHEN fk.oid IS NULL THEN 'foreign_key_count=0'
         ELSE concat(
           'columns=', coalesce(local_cols.cols, ''),
           '|referenced_schema=', coalesce(rn.nspname, 'unknown'),
           '|referenced_table=', coalesce(rt.relname, 'unknown'),
           '|referenced_columns=', coalesce(remote_cols.cols, ''),
           '|delete_action=',
           CASE fk.confdeltype
             WHEN 'a'::"char" THEN 'no_action'
             WHEN 'r'::"char" THEN 'restrict'
             WHEN 'c'::"char" THEN 'cascade'
             WHEN 'n'::"char" THEN 'set_null'
             WHEN 'd'::"char" THEN 'set_default'
             ELSE 'unknown'
           END
         )
       END
FROM relations AS rel
LEFT JOIN pg_constraint AS fk
  ON fk.conrelid = rel.oid
 AND fk.contype = 'f'
LEFT JOIN pg_class AS rt ON rt.oid = fk.confrelid
LEFT JOIN pg_namespace AS rn ON rn.oid = rt.relnamespace
LEFT JOIN LATERAL (
  SELECT coalesce(string_agg(a.attname, ',' ORDER BY u.ord), '') AS cols
  FROM unnest(fk.conkey) WITH ORDINALITY AS u(attnum, ord)
  JOIN pg_attribute AS a
    ON a.attrelid = fk.conrelid
   AND a.attnum = u.attnum
) AS local_cols ON fk.oid IS NOT NULL
LEFT JOIN LATERAL (
  SELECT coalesce(string_agg(a.attname, ',' ORDER BY u.ord), '') AS cols
  FROM unnest(fk.confkey) WITH ORDINALITY AS u(attnum, ord)
  JOIN pg_attribute AS a
    ON a.attrelid = fk.confrelid
   AND a.attnum = u.attnum
) AS remote_cols ON fk.oid IS NOT NULL
UNION ALL
SELECT 'constraint',
       rel.table_name || '.check_constraints',
       CASE
         WHEN rel.oid IS NULL THEN 'absent'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'inconclusive'
         WHEN checks.check_count > 0 THEN 'withheld'
         ELSE 'present'
       END,
       CASE
         WHEN rel.oid IS NULL THEN 'parent_table_absent_from_public'
         WHEN rel.relkind NOT IN ('r', 'p') THEN 'relation_kind_not_an_ordinary_or_partitioned_table'
         WHEN checks.check_count > 0 THEN 'check_count=' || checks.check_count::text || '|bodies_withheld'
         ELSE 'check_count=0'
       END
FROM relations AS rel
LEFT JOIN LATERAL (
  SELECT count(*) AS check_count
  FROM pg_constraint AS ch
  WHERE ch.conrelid = rel.oid
    AND ch.contype = 'c'
) AS checks ON true
ORDER BY section, check_name, detail;

-- STATEMENT 5 of 12. Count null invoices.user_id.
-- Run only if statement 2 reports present for invoices.row_visibility and
-- invoices.user_id. This statement names public.invoices. If that column is
-- absent, the statement errors. That error is not a zero count.
-- Schema nullability stays in statement 2. This count is not attnotnull.
WITH role_info AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
relation_info AS (
  SELECT
    c.oid,
    c.relkind,
    c.relrowsecurity,
    has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'invoices'
    AND c.relkind IN ('r', 'p')
),
column_info AS (
  SELECT
    count(*) AS att_count,
    bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN relation_info AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname IN ('user_id')
)
SELECT 'aggregate'::text AS section,
       'invoices.user_id_null_count'::text AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN rel.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN col.att_count IS DISTINCT FROM 1 THEN 'inconclusive'
         WHEN col.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN rel.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN rel.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN col.att_count IS DISTINCT FROM 1 THEN 'column_not_confirmed_in_this_statement'
         WHEN col.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN rel.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT 'predicate=user_id_is_null|user_id_null=' || count(*)::text
           FROM public.invoices
           WHERE user_id IS NULL
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN relation_info AS rel ON true
LEFT JOIN role_info AS role ON true
LEFT JOIN column_info AS col ON true;

-- STATEMENT 6 of 12. Partition null invoices.user_id by billing_type.
-- Prerequisites, all status present: invoices.row_visibility,
-- invoices.user_id, invoices.billing_type.
-- The four counts partition user_id IS NULL. They do not overlap.
WITH role_info AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
relation_info AS (
  SELECT
    c.oid,
    c.relkind,
    c.relrowsecurity,
    has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'invoices'
    AND c.relkind IN ('r', 'p')
),
column_info AS (
  SELECT
    count(*) AS att_count,
    bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN relation_info AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname IN ('user_id', 'billing_type')
)
SELECT 'aggregate'::text AS section,
       'invoices.user_id_null_by_billing_type'::text AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN rel.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN col.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN rel.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN rel.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN col.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN rel.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'predicate=user_id_is_null|partition=billing_type|no_overlap|individual=',
             count(*) FILTER (WHERE user_id IS NULL AND billing_type = 'individual')::text,
             '|company=',
             count(*) FILTER (WHERE user_id IS NULL AND billing_type = 'company')::text,
             '|billing_type_null=',
             count(*) FILTER (WHERE user_id IS NULL AND billing_type IS NULL)::text,
             '|billing_type_other=',
             count(*) FILTER (
               WHERE user_id IS NULL
                 AND billing_type IS NOT NULL
                 AND billing_type NOT IN ('individual', 'company')
             )::text
           )
           FROM public.invoices
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN relation_info AS rel ON true
LEFT JOIN role_info AS role ON true
LEFT JOIN column_info AS col ON true;

-- STATEMENT 7 of 12. Partition null invoices.user_id by company_id.
-- Prerequisites, all status present: invoices.row_visibility,
-- invoices.user_id, invoices.company_id.
-- company_id_null and company_id_not_null partition user_id IS NULL.
WITH role_info AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
relation_info AS (
  SELECT
    c.oid,
    c.relkind,
    c.relrowsecurity,
    has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'invoices'
    AND c.relkind IN ('r', 'p')
),
column_info AS (
  SELECT
    count(*) AS att_count,
    bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN relation_info AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname IN ('user_id', 'company_id')
)
SELECT 'aggregate'::text AS section,
       'invoices.user_id_null_by_company_id'::text AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN rel.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN col.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN rel.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN rel.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN col.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN rel.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'predicate=user_id_is_null|partition=company_id|no_overlap|company_id_null=',
             count(*) FILTER (WHERE user_id IS NULL AND company_id IS NULL)::text,
             '|company_id_not_null=',
             count(*) FILTER (WHERE user_id IS NULL AND company_id IS NOT NULL)::text
           )
           FROM public.invoices
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN relation_info AS rel ON true
LEFT JOIN role_info AS role ON true
LEFT JOIN column_info AS col ON true;

-- STATEMENT 8 of 12. Partition null invoices.user_id by tenant_id.
-- Prerequisites, all status present: invoices.row_visibility,
-- invoices.user_id, invoices.tenant_id.
-- tenant_id_null and tenant_id_not_null partition user_id IS NULL.
-- This is not the company-link mismatch count in statement 9.
WITH role_info AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
relation_info AS (
  SELECT
    c.oid,
    c.relkind,
    c.relrowsecurity,
    has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'invoices'
    AND c.relkind IN ('r', 'p')
),
column_info AS (
  SELECT
    count(*) AS att_count,
    bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN relation_info AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname IN ('user_id', 'tenant_id')
)
SELECT 'aggregate'::text AS section,
       'invoices.user_id_null_by_tenant_id'::text AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN rel.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN col.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN rel.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN rel.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN col.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN rel.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'predicate=user_id_is_null|partition=tenant_id|no_overlap|tenant_id_null=',
             count(*) FILTER (WHERE user_id IS NULL AND tenant_id IS NULL)::text,
             '|tenant_id_not_null=',
             count(*) FILTER (WHERE user_id IS NULL AND tenant_id IS NOT NULL)::text
           )
           FROM public.invoices
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN relation_info AS rel ON true
LEFT JOIN role_info AS role ON true
LEFT JOIN column_info AS col ON true;

-- STATEMENT 9 of 12. Invoice company link.
-- Prerequisites, all status present: invoices.row_visibility,
-- companies.row_visibility, invoices.company_id, invoices.tenant_id,
-- companies.id, companies.tenant_id.
-- company_linked counts join rows, not distinct invoices. The six following
-- counts partition company_linked and do not overlap:
--   missing_company_row: company_id is not null and companies.id is null
--   both_tenants_null: company row exists and both tenant ids are null
--   invoice_tenant_null: company row exists, invoice tenant is null, company tenant is not
--   company_tenant_null: company row exists, invoice tenant is not null, company tenant is null
--   tenant_mismatch: company row exists and both tenant ids are not null and differ
--   tenant_match: company row exists and both tenant ids are not null and equal
-- A null tenant is not counted as tenant_mismatch.
WITH invoice_role AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
invoice_rel AS (
  SELECT c.oid, c.relkind, c.relrowsecurity,
         has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'invoices' AND c.relkind IN ('r', 'p')
),
company_rel AS (
  SELECT c.oid, c.relkind, c.relrowsecurity,
         has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'companies' AND c.relkind IN ('r', 'p')
),
invoice_cols AS (
  SELECT count(*) AS att_count,
         bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN invoice_rel AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('company_id', 'tenant_id')
),
company_cols AS (
  SELECT count(*) AS att_count,
         bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN company_rel AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('id', 'tenant_id')
)
SELECT 'aggregate'::text AS section,
       'invoices.company_link'::text AS check_name,
       CASE
         WHEN inv.oid IS NULL OR comp.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN inv.can_select IS NOT TRUE OR comp.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN ic.att_count IS DISTINCT FROM 2 OR cc.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN ic.can_columns IS NOT TRUE OR cc.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN inv.relkind IS DISTINCT FROM 'r' OR comp.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN inv.relrowsecurity OR comp.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN inv.oid IS NULL OR comp.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN inv.can_select IS NOT TRUE OR comp.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN ic.att_count IS DISTINCT FROM 2 OR cc.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN ic.can_columns IS NOT TRUE OR cc.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN inv.relkind IS DISTINCT FROM 'r' OR comp.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN inv.relrowsecurity OR comp.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'unit=join_row|not_deduplicated|join=invoices.company_id=companies.id|predicate=company_id_is_not_null|company_linked=',
             count(*) FILTER (WHERE i.company_id IS NOT NULL)::text,
             '|missing_company_row=',
             count(*) FILTER (WHERE i.company_id IS NOT NULL AND c.id IS NULL)::text,
             '|both_tenants_null=',
             count(*) FILTER (
               WHERE i.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND i.tenant_id IS NULL AND c.tenant_id IS NULL
             )::text,
             '|invoice_tenant_null=',
             count(*) FILTER (
               WHERE i.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND i.tenant_id IS NULL AND c.tenant_id IS NOT NULL
             )::text,
             '|company_tenant_null=',
             count(*) FILTER (
               WHERE i.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND i.tenant_id IS NOT NULL AND c.tenant_id IS NULL
             )::text,
             '|tenant_mismatch=',
             count(*) FILTER (
               WHERE i.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND i.tenant_id IS NOT NULL AND c.tenant_id IS NOT NULL
                 AND i.tenant_id IS DISTINCT FROM c.tenant_id
             )::text,
             '|tenant_match=',
             count(*) FILTER (
               WHERE i.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND i.tenant_id IS NOT NULL AND c.tenant_id IS NOT NULL
                 AND i.tenant_id IS NOT DISTINCT FROM c.tenant_id
             )::text
           )
           FROM public.invoices AS i
           LEFT JOIN public.companies AS c ON c.id = i.company_id
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN invoice_rel AS inv ON true
LEFT JOIN company_rel AS comp ON true
LEFT JOIN invoice_role AS role ON true
LEFT JOIN invoice_cols AS ic ON true
LEFT JOIN company_cols AS cc ON true;

-- STATEMENT 10 of 12. User company link.
-- Prerequisites, all status present: users.row_visibility,
-- companies.row_visibility, users.company_id, users.tenant_id,
-- companies.id, companies.tenant_id.
-- Same partition as statement 9, on users.company_id. Null tenant is not
-- tenant_mismatch. user_id is not involved.
WITH user_role AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
user_rel AS (
  SELECT c.oid, c.relkind, c.relrowsecurity,
         has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind IN ('r', 'p')
),
company_rel AS (
  SELECT c.oid, c.relkind, c.relrowsecurity,
         has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'companies' AND c.relkind IN ('r', 'p')
),
user_cols AS (
  SELECT count(*) AS att_count,
         bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN user_rel AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('company_id', 'tenant_id')
),
company_cols AS (
  SELECT count(*) AS att_count,
         bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN company_rel AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('id', 'tenant_id')
)
SELECT 'aggregate'::text AS section,
       'users.company_link'::text AS check_name,
       CASE
         WHEN u.oid IS NULL OR comp.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN u.can_select IS NOT TRUE OR comp.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN uc.att_count IS DISTINCT FROM 2 OR cc.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN uc.can_columns IS NOT TRUE OR cc.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN u.relkind IS DISTINCT FROM 'r' OR comp.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN u.relrowsecurity OR comp.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN u.oid IS NULL OR comp.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN u.can_select IS NOT TRUE OR comp.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN uc.att_count IS DISTINCT FROM 2 OR cc.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN uc.can_columns IS NOT TRUE OR cc.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN u.relkind IS DISTINCT FROM 'r' OR comp.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN u.relrowsecurity OR comp.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'unit=join_row|not_deduplicated|join=users.company_id=companies.id|predicate=company_id_is_not_null|user_linked=',
             count(*) FILTER (WHERE u.company_id IS NOT NULL)::text,
             '|missing_company_row=',
             count(*) FILTER (WHERE u.company_id IS NOT NULL AND c.id IS NULL)::text,
             '|both_tenants_null=',
             count(*) FILTER (
               WHERE u.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND u.tenant_id IS NULL AND c.tenant_id IS NULL
             )::text,
             '|user_tenant_null=',
             count(*) FILTER (
               WHERE u.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND u.tenant_id IS NULL AND c.tenant_id IS NOT NULL
             )::text,
             '|company_tenant_null=',
             count(*) FILTER (
               WHERE u.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND u.tenant_id IS NOT NULL AND c.tenant_id IS NULL
             )::text,
             '|tenant_mismatch=',
             count(*) FILTER (
               WHERE u.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND u.tenant_id IS NOT NULL AND c.tenant_id IS NOT NULL
                 AND u.tenant_id IS DISTINCT FROM c.tenant_id
             )::text,
             '|tenant_match=',
             count(*) FILTER (
               WHERE u.company_id IS NOT NULL AND c.id IS NOT NULL
                 AND u.tenant_id IS NOT NULL AND c.tenant_id IS NOT NULL
                 AND u.tenant_id IS NOT DISTINCT FROM c.tenant_id
             )::text
           )
           FROM public.users AS u
           LEFT JOIN public.companies AS c ON c.id = u.company_id
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN user_rel AS u ON true
LEFT JOIN company_rel AS comp ON true
LEFT JOIN user_role AS role ON true
LEFT JOIN user_cols AS uc ON true
LEFT JOIN company_cols AS cc ON true;

-- STATEMENT 11 of 12. Personal credit user and tenant.
-- Prerequisites, all status present: student_credits.row_visibility,
-- users.row_visibility, student_credits.user_id, student_credits.tenant_id,
-- users.id, users.tenant_id.
-- The seven counts partition student_credits join rows and do not overlap:
--   user_id_null: student_credits.user_id is null
--   user_id_unresolved: user_id is not null and users.id is null
--   both_tenants_null: user row exists and both tenant ids are null
--   credit_tenant_null: user row exists, credit tenant is null, user tenant is not
--   user_tenant_null: user row exists, credit tenant is not null, user tenant is null
--   tenant_mismatch: user row exists and both tenant ids are not null and differ
--   tenant_match: user row exists and both tenant ids are not null and equal
-- A null user_id is not user_id_unresolved. A null tenant is not tenant_mismatch.
-- attnotnull from statement 2 is a separate fact.
WITH credit_role AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
credit_rel AS (
  SELECT c.oid, c.relkind, c.relrowsecurity,
         has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'student_credits' AND c.relkind IN ('r', 'p')
),
user_rel AS (
  SELECT c.oid, c.relkind, c.relrowsecurity,
         has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind IN ('r', 'p')
),
credit_cols AS (
  SELECT count(*) AS att_count,
         bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN credit_rel AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('user_id', 'tenant_id')
),
user_cols AS (
  SELECT count(*) AS att_count,
         bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN user_rel AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('id', 'tenant_id')
)
SELECT 'aggregate'::text AS section,
       'student_credits.user_tenant_link'::text AS check_name,
       CASE
         WHEN cr.oid IS NULL OR u.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN cr.can_select IS NOT TRUE OR u.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN cc.att_count IS DISTINCT FROM 2 OR uc.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN cc.can_columns IS NOT TRUE OR uc.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN cr.relkind IS DISTINCT FROM 'r' OR u.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN cr.relrowsecurity OR u.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN cr.oid IS NULL OR u.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN cr.can_select IS NOT TRUE OR u.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN cc.att_count IS DISTINCT FROM 2 OR uc.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN cc.can_columns IS NOT TRUE OR uc.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN cr.relkind IS DISTINCT FROM 'r' OR u.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN cr.relrowsecurity OR u.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'unit=join_row|not_deduplicated|join=student_credits.user_id=users.id|user_id_null=',
             count(*) FILTER (WHERE sc.user_id IS NULL)::text,
             '|user_id_unresolved=',
             count(*) FILTER (WHERE sc.user_id IS NOT NULL AND u.id IS NULL)::text,
             '|both_tenants_null=',
             count(*) FILTER (
               WHERE sc.user_id IS NOT NULL AND u.id IS NOT NULL
                 AND sc.tenant_id IS NULL AND u.tenant_id IS NULL
             )::text,
             '|credit_tenant_null=',
             count(*) FILTER (
               WHERE sc.user_id IS NOT NULL AND u.id IS NOT NULL
                 AND sc.tenant_id IS NULL AND u.tenant_id IS NOT NULL
             )::text,
             '|user_tenant_null=',
             count(*) FILTER (
               WHERE sc.user_id IS NOT NULL AND u.id IS NOT NULL
                 AND sc.tenant_id IS NOT NULL AND u.tenant_id IS NULL
             )::text,
             '|tenant_mismatch=',
             count(*) FILTER (
               WHERE sc.user_id IS NOT NULL AND u.id IS NOT NULL
                 AND sc.tenant_id IS NOT NULL AND u.tenant_id IS NOT NULL
                 AND sc.tenant_id IS DISTINCT FROM u.tenant_id
             )::text,
             '|tenant_match=',
             count(*) FILTER (
               WHERE sc.user_id IS NOT NULL AND u.id IS NOT NULL
                 AND sc.tenant_id IS NOT NULL AND u.tenant_id IS NOT NULL
                 AND sc.tenant_id IS NOT DISTINCT FROM u.tenant_id
             )::text
           )
           FROM public.student_credits AS sc
           LEFT JOIN public.users AS u ON u.id = sc.user_id
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN credit_rel AS cr ON true
LEFT JOIN user_rel AS u ON true
LEFT JOIN credit_role AS role ON true
LEFT JOIN credit_cols AS cc ON true
LEFT JOIN user_cols AS uc ON true;

-- STATEMENT 12 of 12. Optional. Do not run unless statement 2 reports
-- present for invoices.row_visibility, invoices.user_id, and
-- invoices.bill_to_kind. The repository does not add bill_to_kind. Running
-- this statement while that column is absent is a parse error, not a count.
-- The four counts partition user_id IS NULL. Values other than individual
-- and company are folded to bill_to_kind_other so the raw value is not shown.
WITH role_info AS (
  SELECT r.oid AS role_oid
  FROM pg_roles AS r
  WHERE r.rolname = current_user
),
relation_info AS (
  SELECT
    c.oid,
    c.relkind,
    c.relrowsecurity,
    has_table_privilege(c.oid, 'SELECT') AS can_select
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'invoices'
    AND c.relkind IN ('r', 'p')
),
column_info AS (
  SELECT
    count(*) AS att_count,
    bool_and(has_column_privilege(a.attrelid, a.attnum, 'SELECT')) AS can_columns
  FROM pg_attribute AS a
  JOIN relation_info AS rel ON rel.oid = a.attrelid
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname IN ('user_id', 'bill_to_kind')
)
SELECT 'aggregate'::text AS section,
       'invoices.user_id_null_by_bill_to_kind'::text AS check_name,
       CASE
         WHEN rel.oid IS NULL THEN 'inconclusive'
         WHEN role.role_oid IS NULL THEN 'inconclusive'
         WHEN rel.can_select IS NOT TRUE THEN 'inconclusive'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'inconclusive'
         WHEN col.can_columns IS NOT TRUE THEN 'inconclusive'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'inconclusive'
         WHEN rel.relrowsecurity THEN 'inconclusive'
         ELSE 'ok'
       END::text AS status,
       CASE
         WHEN rel.oid IS NULL THEN 'relation_not_confirmed_in_this_statement'
         WHEN role.role_oid IS NULL THEN 'current_role_not_visible_in_pg_roles'
         WHEN rel.can_select IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN col.att_count IS DISTINCT FROM 2 THEN 'column_not_confirmed_in_this_statement'
         WHEN col.can_columns IS NOT TRUE THEN 'select_privilege_not_established'
         WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'relation_kind_visibility_not_established'
         WHEN rel.relrowsecurity THEN 'row_visibility_not_established'
         ELSE (
           SELECT concat(
             'predicate=user_id_is_null|partition=bill_to_kind|no_overlap|individual=',
             count(*) FILTER (WHERE user_id IS NULL AND bill_to_kind = 'individual')::text,
             '|company=',
             count(*) FILTER (WHERE user_id IS NULL AND bill_to_kind = 'company')::text,
             '|bill_to_kind_null=',
             count(*) FILTER (WHERE user_id IS NULL AND bill_to_kind IS NULL)::text,
             '|bill_to_kind_other=',
             count(*) FILTER (
               WHERE user_id IS NULL
                 AND bill_to_kind IS NOT NULL
                 AND bill_to_kind NOT IN ('individual', 'company')
             )::text
           )
           FROM public.invoices
         )
       END::text AS detail
FROM (SELECT 1) AS anchor
LEFT JOIN relation_info AS rel ON true
LEFT JOIN role_info AS role ON true
LEFT JOIN column_info AS col ON true;
