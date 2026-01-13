-- EINFACHE QUERY: Alle Trigger anschauen
-- Dies ist die sichere und einfache Methode in Supabase

SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

