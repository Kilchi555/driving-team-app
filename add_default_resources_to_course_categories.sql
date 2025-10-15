-- In Supabase SQL Editor ausführen:
ALTER TABLE course_categories 
ADD COLUMN default_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
ADD COLUMN default_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_categories_default_room ON course_categories(default_room_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_default_vehicle ON course_categories(default_vehicle_id);