-- Einzelne INSERT Statements für evaluation_scale (ohne ON CONFLICT)
-- Führe diese Statements nacheinander aus (mit Pausen dazwischen)

-- Rating 1
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (1, 'Besprochen', 'Das Thema wurde besprochen', '#EF4444', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW());

-- Rating 2  
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (2, 'Geübt', 'Das Thema wurde geübt', '#F59E0B', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW());

-- Rating 3
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (3, 'Ungenügend', 'Ungenügende Leistung', '#DC2626', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW());

-- Rating 4
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (4, 'Genügend', 'Genügende Leistung', '#059669', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW());

-- Rating 5
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (5, 'Gut', 'Gute Leistung', '#10B981', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW());

-- Rating 6
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id, created_at)
VALUES (6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#047857', true, '64259d68-195a-4c68-8875-f1b44d962830', NOW());
