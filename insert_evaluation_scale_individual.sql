-- Einzelne INSERT Statements für evaluation_scale
-- Führe diese Statements nacheinander aus (mit Pausen dazwischen)

-- Rating 1
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (1, 'Besprochen', 'Das Thema wurde besprochen', '#EF4444', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW())
ON CONFLICT (rating, tenant_id) DO NOTHING;

-- Rating 2  
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (2, 'Geübt', 'Das Thema wurde geübt', '#F59E0B', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW())
ON CONFLICT (rating, tenant_id) DO NOTHING;

-- Rating 3
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (3, 'Ungenügend', 'Ungenügende Leistung', '#DC2626', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW())
ON CONFLICT (rating, tenant_id) DO NOTHING;

-- Rating 4
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (4, 'Genügend', 'Genügende Leistung', '#059669', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW())
ON CONFLICT (rating, tenant_id) DO NOTHING;

-- Rating 5
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (5, 'Gut', 'Gute Leistung', '#10B981', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW())
ON CONFLICT (rating, tenant_id) DO NOTHING;

-- Rating 6
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#047857', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW())
ON CONFLICT (rating, tenant_id) DO NOTHING;
