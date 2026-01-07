-- Check welche Tabellen existieren
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
