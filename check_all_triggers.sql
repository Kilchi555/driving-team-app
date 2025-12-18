-- Query: Alle Trigger in der Datenbank überprüfen
-- Dies zeigt welche Trigger auf welche Tabellen wirken

SELECT 
    t.trigger_schema,
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY 
    t.event_object_table,
    t.trigger_name;

-- Detailierte Trigger Information
-- Diese Query zeigt auch die zugehörigen Funktionen
SELECT 
    n.nspname as schema_name,
    t.tgname as trigger_name,
    'BEFORE' as trigger_time,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.relname, t.tgname;

-- Nur Trigger auf unseren wichtigen Tabellen
-- Zeige Trigger auf cancellation_policies, cancellation_rules, appointments, etc.
SELECT 
    t.trigger_schema,
    t.trigger_name,
    t.event_object_table,
    t.event_manipulation,
    t.action_timing
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
AND t.event_object_table IN (
    'cancellation_policies',
    'cancellation_rules', 
    'appointments',
    'payments',
    'users',
    'staff_working_hours',
    'student_credits'
)
ORDER BY t.event_object_table, t.trigger_name;

-- Alternative: Alle UPDATE_AT Funktionen finden
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prokind as function_kind
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname LIKE '%updated_at%' OR p.proname LIKE '%trigger%')
ORDER BY n.nspname, p.proname;

