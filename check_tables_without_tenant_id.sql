-- Abfrage um alle Tabellen zu finden, die keine tenant_id Spalte haben
SELECT 
    t.table_name,
    t.table_type
FROM 
    information_schema.tables t
LEFT JOIN 
    information_schema.columns c ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema 
    AND c.column_name = 'tenant_id'
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IS NULL
ORDER BY 
    t.table_name;

-- Alternative detailliertere Version mit mehr Informationen
-- SELECT 
--     t.table_name,
--     t.table_type,
--     CASE 
--         WHEN c.column_name IS NULL THEN 'KEINE tenant_id'
--         ELSE 'HAS tenant_id'
--     END as tenant_id_status
-- FROM 
--     information_schema.tables t
-- LEFT JOIN 
--     information_schema.columns c ON t.table_name = c.table_name 
--     AND t.table_schema = c.table_schema 
--     AND c.column_name = 'tenant_id'
-- WHERE 
--     t.table_schema = 'public'
--     AND t.table_type = 'BASE TABLE'
-- ORDER BY 
--     tenant_id_status DESC, t.table_name;