-- Marker for auto-managed waitlist placeholder courses (synced when category.waitlist_enabled).
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_auto_waitlist boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.is_auto_waitlist IS
  'True if this course is an auto-managed waitlist placeholder for a category with waitlist_enabled. Safe to activate/demote via syncAutoCategoryWaitlists.';

CREATE INDEX IF NOT EXISTS idx_courses_auto_waitlist
  ON courses (tenant_id, course_category_id, city)
  WHERE is_auto_waitlist = true;
