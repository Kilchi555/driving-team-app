-- Debug: Finde Duplikate und verstehe die Struktur der categories Tabelle

-- 1. Zeige alle Categories mit Code "A"
SELECT 'CODE_A_ANALYSIS' as status, 
  id, name, code, 
  CASE WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE' ELSE 'TENANT_SPECIFIC' END as type,
  tenant_id, created_at
FROM categories 
WHERE code = 'A'
ORDER BY created_at;

-- 2. Zeige alle Codes und deren Anzahl
SELECT 'CODE_COUNTS' as status, 
  code, 
  COUNT(*) as total_count,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as standard_templates,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as tenant_specific
FROM categories
GROUP BY code
ORDER BY code;

-- 3. Zeige alle Categories (vollständig)
SELECT 'ALL_CATEGORIES' as status, 
  id, name, description, code, color,
  CASE WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE' ELSE 'TENANT_SPECIFIC' END as type,
  tenant_id, created_at
FROM categories 
ORDER BY code, type;

-- 4. Finde Duplikate (Codes, die mehr als einmal vorkommen)
SELECT 'DUPLICATE_CODES' as status, 
  code, 
  COUNT(*) as count,
  array_agg(id) as ids,
  array_agg(CASE WHEN tenant_id IS NULL THEN 'STANDARD' ELSE 'TENANT' END) as types
FROM categories
GROUP BY code
HAVING COUNT(*) > 1
ORDER BY code;
