-- ============================================================
-- LESSON PACKAGES SYSTEM
-- Supports: 5er / 10er / VKU + N Lektionen packages
-- ============================================================

-- 1. Package definitions (created by admin, shown to customers)
CREATE TABLE IF NOT EXISTS lesson_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name            TEXT NOT NULL,          -- "5er Paket", "10er Paket", "VKU + 10 Lektionen"
  description     TEXT,
  color           TEXT DEFAULT '#3B82F6', -- UI accent color

  -- Lesson credits
  lessons_count   INTEGER NOT NULL DEFAULT 0,   -- 0 = no lesson credits (course-only bundle)
  category_code   TEXT,                         -- NULL = all categories, 'B' = only Kat. B

  -- Bundled course (optional)
  includes_course BOOLEAN NOT NULL DEFAULT false,
  course_category TEXT,                         -- e.g. 'VKU', 'NAP' — matches courses.category

  -- Pricing
  price_rappen          INTEGER NOT NULL,       -- Total package price
  regular_price_rappen  INTEGER,               -- "Normal" price for savings display (optional)

  -- Settings
  valid_days      INTEGER NOT NULL DEFAULT 365, -- Lessons expire N days after purchase
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_public       BOOLEAN NOT NULL DEFAULT true, -- Show on public-facing pages

  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customer package instances (one per purchase)
CREATE TABLE IF NOT EXISTS customer_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id      UUID NOT NULL REFERENCES lesson_packages(id),

  -- Lesson tracking
  lessons_total   INTEGER NOT NULL,
  lessons_used    INTEGER NOT NULL DEFAULT 0,

  -- Dates
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,            -- NULL = never expires

  -- Payment / source
  payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
  assigned_by     UUID REFERENCES users(id) ON DELETE SET NULL, -- admin who assigned manually
  notes           TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Track which appointment used which package credit
CREATE TABLE IF NOT EXISTS package_lesson_uses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  used_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at         TIMESTAMPTZ,         -- Set if appointment is cancelled and credit returned
  reversed_reason     TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_packages_user    ON customer_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_tenant  ON customer_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_packages_tenant    ON lesson_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_package_uses_package      ON package_lesson_uses(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_package_uses_appointment  ON package_lesson_uses(appointment_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lesson_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lesson_packages_updated_at ON lesson_packages;
CREATE TRIGGER trg_lesson_packages_updated_at
  BEFORE UPDATE ON lesson_packages
  FOR EACH ROW EXECUTE FUNCTION update_lesson_packages_updated_at();
