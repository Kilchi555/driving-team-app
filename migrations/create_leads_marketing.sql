-- Leads & Email-Marketing System
-- Getrennt von imported_customers — eigener Lifecycle mit Consent-Tracking

CREATE TABLE IF NOT EXISTS leads (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid        NOT NULL,
  email              text        NOT NULL,
  first_name         text,
  last_name          text,
  phone              text,
  categories         text[]      NOT NULL DEFAULT '{}',
  status             text        NOT NULL DEFAULT 'pending_consent',
    -- pending_consent | active | unsubscribed | bounced | inactive
  consent_given_at   timestamptz,
  consent_source     text,
    -- re_consent_email | website_form | booking | manual
  source             text,
    -- csv_import_2024_auto | website | affiliate | manual
  last_emailed_at    timestamptz,
  tags               text[]      NOT NULL DEFAULT '{}',
  notes              text,
  unsubscribe_token  uuid        NOT NULL DEFAULT gen_random_uuid(),
  imported_at        timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id   ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status       ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_categories   ON leads USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_leads_email        ON leads(tenant_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_unsubscribe  ON leads(unsubscribe_token);

COMMENT ON TABLE leads IS 'Marketing-Leads mit Consent-Tracking; getrennt von imported_customers und auth.users';
COMMENT ON COLUMN leads.status IS 'pending_consent = importiert aber noch kein Opt-In; active = confirmed; unsubscribed = hat abgemeldet; bounced = Email bounced; inactive = nie bestätigt + timeout';
COMMENT ON COLUMN leads.unsubscribe_token IS 'Sicherer Token für Abmelde-Links in Emails (UUID, nicht rate-limitable)';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_import_jobs (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid        NOT NULL,
  filename           text,
  source_label       text        NOT NULL,
  status             text        NOT NULL DEFAULT 'processing',
    -- processing | completed | failed
  total_rows         int         NOT NULL DEFAULT 0,
  imported_count     int         NOT NULL DEFAULT 0,
  skipped_count      int         NOT NULL DEFAULT 0,
  error_count        int         NOT NULL DEFAULT 0,
  errors_log         jsonb       NOT NULL DEFAULT '[]',
  default_categories text[]      NOT NULL DEFAULT '{}',
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_tenant ON lead_import_jobs(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid        NOT NULL,
  name        text        NOT NULL,
  subject     text        NOT NULL,
  html_body   text        NOT NULL,
  text_body   text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);

COMMENT ON COLUMN email_templates.html_body IS 'Unterstützt Variablen: {{first_name}}, {{last_name}}, {{email}}, {{unsubscribe_link}}';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_campaigns (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           uuid        NOT NULL,
  name                text        NOT NULL,
  template_id         uuid        REFERENCES email_templates(id) ON DELETE SET NULL,
  subject_override    text,
  segment_filter      jsonb       NOT NULL DEFAULT '{}',
    -- {categories: ['auto'], status: 'active', tags: ['interest_motorrad']}
  status              text        NOT NULL DEFAULT 'draft',
    -- draft | sending | sent | failed
  sent_at             timestamptz,
  total_recipients    int         NOT NULL DEFAULT 0,
  sent_count          int         NOT NULL DEFAULT 0,
  bounce_count        int         NOT NULL DEFAULT 0,
  unsubscribe_count   int         NOT NULL DEFAULT 0,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant ON email_campaigns(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_campaign_leads (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id           uuid        NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  lead_id               uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  outbound_message_id   uuid,
  status                text        NOT NULL DEFAULT 'queued',
    -- queued | sent | bounced | unsubscribed | failed
  sent_at               timestamptz,
  UNIQUE(campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_ecl_campaign ON email_campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ecl_lead     ON email_campaign_leads(lead_id);
