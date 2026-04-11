-- Supabase Linter 0011: function_search_path_mutable
-- Setzt für alle public-Funktionen/Prozeduren (ohne bereits gesetztes search_path)
-- ein fixes search_path → verhindert search_path-Manipulation durch Session-User.
--
-- Hinweis zu weiteren WARNungen aus dem gleichen Lauf:
-- - rls_policy_always_true: bewusst offene Policies (z. B. anon INSERT, Service-Policies).
--   Verschärfung nur geplant mit Produkt-/App-Review (nicht blind automatisieren).
-- - vulnerable_postgres_version: Upgrade über Supabase Dashboard → Project Settings → Database.

DO $$
DECLARE
  r RECORD;
  stmt text;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      CASE p.prokind
        WHEN 'p' THEN 'PROCEDURE'
        ELSE 'FUNCTION'
      END AS obj_kind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p', 'w')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg(setting)
        WHERE cfg.setting LIKE 'search_path=%'
      )
    ORDER BY p.proname, p.oid
  LOOP
    stmt := format(
      'ALTER %s %I.%I(%s) SET search_path TO pg_catalog, public',
      r.obj_kind,
      r.schema_name,
      r.proname,
      r.identity_args
    );
    BEGIN
      EXECUTE stmt;
      RAISE NOTICE 'OK: %', stmt;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Übersprungen (Fehler): % — %', stmt, SQLERRM;
    END;
  END LOOP;
END $$;
