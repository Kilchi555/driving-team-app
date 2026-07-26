-- Staff privilege: see all tenant students without becoming admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_all_students boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN users.can_view_all_students IS
  'When true, staff sees all tenant students (like Alle) without needing admin role.';
