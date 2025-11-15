-- Check foreign keys from appointments table
SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.referential_constraints
WHERE table_name = 'appointments'
UNION ALL
SELECT 
  constraint_name,
  table_schema::text as table_name,
  column_name::text,
  foreign_table_name::text as referenced_table_name,
  foreign_column_name::text as referenced_column_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'appointments';

-- Or try direct query of appointments columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;
