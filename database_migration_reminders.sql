-- Reminder system migrations
-- Creates: reminder_settings, reminder_templates, reminder_providers
-- Notes:
-- - Multi-tenant via tenant_id (UUID). If you do not use tenants yet, keep NULL and treat as global defaults.
-- - RLS enabled; simple policies for authenticated users to manage their tenant's rows.

-- 1) Settings per tenant: timings, channels, auto-delete
CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  tenant_id UUID NULL,

  -- Master switch
  is_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Timings (hours after appointment creation)
  first_after_hours INTEGER NOT NULL DEFAULT 24,
  second_after_hours INTEGER NOT NULL DEFAULT 48,
  final_after_hours INTEGER NOT NULL DEFAULT 72,

  -- Channel toggles per stage
  first_email BOOLEAN NOT NULL DEFAULT true,
  first_push  BOOLEAN NOT NULL DEFAULT true,
  first_sms   BOOLEAN NOT NULL DEFAULT false,

  second_email BOOLEAN NOT NULL DEFAULT true,
  second_push  BOOLEAN NOT NULL DEFAULT true,
  second_sms   BOOLEAN NOT NULL DEFAULT false,

  final_email BOOLEAN NOT NULL DEFAULT false,
  final_push  BOOLEAN NOT NULL DEFAULT false,
  final_sms   BOOLEAN NOT NULL DEFAULT true,

  -- Auto deletion
  auto_delete BOOLEAN NOT NULL DEFAULT true,
  auto_delete_after_hours INTEGER NOT NULL DEFAULT 3, -- after final warning

  -- Audit
  updated_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_reminder_settings_tenant ON reminder_settings(tenant_id);

-- 2) Templates per tenant / channel / stage / language
-- channel: 'email' | 'push' | 'sms'
-- stage: 'first' | 'second' | 'final'
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  tenant_id UUID NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','push','sms')),
  stage TEXT NOT NULL CHECK (stage IN ('first','second','final')),
  language TEXT NOT NULL DEFAULT 'de',

  subject TEXT NULL,        -- for email
  body TEXT NOT NULL,       -- supports handlebars-like placeholders: {student_name}, {appointment_date}, {confirmation_link}

  updated_by UUID NULL,

  UNIQUE (tenant_id, channel, stage, language)
);

CREATE INDEX IF NOT EXISTS idx_reminder_templates_tenant ON reminder_templates(tenant_id);

-- 3) Provider settings (SMTP + SMS) per tenant
-- WARNING: Store secrets securely. This table is a starting point; consider using Vault/KMS for production.
CREATE TABLE IF NOT EXISTS reminder_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  tenant_id UUID NULL,

  -- SMTP (generic)
  smtp_enabled BOOLEAN NOT NULL DEFAULT true,
  smtp_host TEXT NULL,
  smtp_port INTEGER NULL,
  smtp_username TEXT NULL,
  smtp_password TEXT NULL,       -- consider encrypting at rest
  smtp_from_name TEXT NULL,
  smtp_from_email TEXT NULL,
  smtp_use_tls BOOLEAN NOT NULL DEFAULT true,

  -- SMS (Twilio default)
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_provider TEXT NOT NULL DEFAULT 'twilio', -- 'twilio' | 'messagebird' | 'other'
  sms_account_sid TEXT NULL,
  sms_auth_token TEXT NULL,
  sms_from TEXT NULL,
  sms_quiet_hours_start INTEGER NULL, -- 0-23 local hours
  sms_quiet_hours_end INTEGER NULL,

  -- Web Push (VAPID)
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  vapid_public_key TEXT NULL,
  vapid_private_key TEXT NULL,
  vapid_subject TEXT NULL,

  updated_by UUID NULL,

  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_providers_tenant ON reminder_providers(tenant_id);

-- 4) Triggers to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reminder_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_reminder_settings_updated_at
      BEFORE UPDATE ON reminder_settings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reminder_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_reminder_templates_updated_at
      BEFORE UPDATE ON reminder_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reminder_providers_updated_at'
  ) THEN
    CREATE TRIGGER trg_reminder_providers_updated_at
      BEFORE UPDATE ON reminder_providers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

-- 5) Enable RLS and add basic policies for authenticated users
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_providers ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users full access (adjust later to scope by tenant_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reminder_settings' AND policyname = 'reminder_settings_authenticated_rw'
  ) THEN
    CREATE POLICY reminder_settings_authenticated_rw ON reminder_settings
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reminder_templates' AND policyname = 'reminder_templates_authenticated_rw'
  ) THEN
    CREATE POLICY reminder_templates_authenticated_rw ON reminder_templates
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reminder_providers' AND policyname = 'reminder_providers_authenticated_rw'
  ) THEN
    CREATE POLICY reminder_providers_authenticated_rw ON reminder_providers
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 6) Seed default templates (DE) if none exist (global templates with NULL tenant)
INSERT INTO reminder_templates (tenant_id, channel, stage, language, subject, body)
SELECT NULL, 'email', 'first', 'de', 'Bitte Termin bestätigen', 'Hallo {student_name}, bitte bestätige deinen Termin am {appointment_date}. {confirmation_link}'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates WHERE tenant_id IS NULL AND channel='email' AND stage='first' AND language='de'
);

INSERT INTO reminder_templates (tenant_id, channel, stage, language, subject, body)
SELECT NULL, 'email', 'second', 'de', 'Erinnerung: Termin bestätigen', 'Hallo {student_name}, du hast deinen Termin am {appointment_date} noch nicht bestätigt. {confirmation_link}'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates WHERE tenant_id IS NULL AND channel='email' AND stage='second' AND language='de'
);

INSERT INTO reminder_templates (tenant_id, channel, stage, language, subject, body)
SELECT NULL, 'email', 'final', 'de', 'Letzte Erinnerung', 'Letzte Erinnerung: Bitte bestätige deinen Termin am {appointment_date}. Der Termin wird sonst automatisch gelöscht.'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates WHERE tenant_id IS NULL AND channel='email' AND stage='final' AND language='de'
);

INSERT INTO reminder_templates (tenant_id, channel, stage, language, body)
SELECT NULL, 'sms', 'final', 'de', 'Letzte Erinnerung: Termin am {appointment_date} bestätigen: {confirmation_link}. Sonst wird er gelöscht.'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates WHERE tenant_id IS NULL AND channel='sms' AND stage='final' AND language='de'
);

INSERT INTO reminder_templates (tenant_id, channel, stage, language, body)
SELECT NULL, 'push', 'first', 'de', 'Bitte bestätige deinen Termin am {appointment_date}.'
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates WHERE tenant_id IS NULL AND channel='push' AND stage='first' AND language='de'
);


