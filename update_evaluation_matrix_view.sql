-- Update v_evaluation_matrix view to include tenant_id for proper tenant isolation
DROP VIEW IF EXISTS v_evaluation_matrix;

CREATE OR REPLACE VIEW v_evaluation_matrix AS
SELECT 
    ec.id as category_id,
    ec.name as category_name,
    ec.color as category_color,
    ec.display_order as category_order,
    ec.driving_categories,
    ec.tenant_id,
    cr.id as criteria_id,
    cr.name as criteria_name,
    cr.description as criteria_description,
    cr.display_order as criteria_order,
    cr.is_required,
    cr.is_active
FROM evaluation_categories ec
JOIN evaluation_criteria cr ON cr.category_id = ec.id
WHERE ec.is_active = true AND cr.is_active = true
ORDER BY ec.display_order, cr.display_order;
