-- Create RPC function for category statistics
-- This function provides detailed statistics about category distribution

CREATE OR REPLACE FUNCTION get_category_stats(tenant_id UUID)
RETURNS TABLE (
  category_code TEXT,
  staff_count BIGINT,
  total_appointments BIGINT,
  active_staff BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH category_unnest AS (
    SELECT 
      u.id as user_id,
      unnest(u.category) as category_code
    FROM users u
    WHERE u.tenant_id = $1 
    AND u.role = 'staff'
    AND u.is_active = true
    AND u.category IS NOT NULL
  ),
  category_counts AS (
    SELECT 
      cn.category_code,
      COUNT(DISTINCT cn.user_id) as staff_count,
      COUNT(DISTINCT cn.user_id) as active_staff
    FROM category_unnest cn
    GROUP BY cn.category_code
  ),
  appointment_counts AS (
    SELECT 
      cn.category_code,
      COUNT(a.id) as total_appointments
    FROM category_unnest cn
    LEFT JOIN appointments a ON a.staff_id = cn.user_id
    WHERE a.tenant_id = $1 OR a.tenant_id IS NULL
    GROUP BY cn.category_code
  )
  SELECT 
    cc.category_code,
    cc.staff_count,
    COALESCE(ac.total_appointments, 0) as total_appointments,
    cc.active_staff
  FROM category_counts cc
  LEFT JOIN appointment_counts ac ON cc.category_code = ac.category_code
  ORDER BY cc.staff_count DESC, cc.category_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_category_stats(UUID) TO authenticated;

-- Test the function
SELECT * FROM get_category_stats('64259d68-195a-4c68-8875-f1b44d962830'::UUID);

-- Create additional helper function for category validation
CREATE OR REPLACE FUNCTION is_staff_qualified_for_category(
  staff_id UUID,
  required_category TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = staff_id 
    AND role = 'staff' 
    AND is_active = true
    AND required_category = ANY(category)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_staff_qualified_for_category(UUID, TEXT) TO authenticated;
