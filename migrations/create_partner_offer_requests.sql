-- Partner offer requests: stores minimal contact data from partner campaign forms.
-- Documents are NOT stored here — they are uploaded temporarily, emailed, then deleted.

CREATE TABLE IF NOT EXISTS partner_offer_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_slug      text NOT NULL DEFAULT 'helvetia',  -- e.g. 'helvetia', 'zurich'
  first_name        text,
  last_name         text,
  email             text NOT NULL,
  phone             text,
  insurance_types   text[] NOT NULL DEFAULT '{}',
  notes             text,
  status            text NOT NULL DEFAULT 'sent',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_offer_requests_tenant_idx ON partner_offer_requests(tenant_id);
CREATE INDEX IF NOT EXISTS partner_offer_requests_partner_idx ON partner_offer_requests(partner_slug);

-- RLS
ALTER TABLE partner_offer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can read own partner_offer_requests"
  ON partner_offer_requests FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Service role handles inserts via server-side API only

-- Private storage bucket for temporary document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-documents',
  'partner-documents',
  false,
  10485760, -- 10 MB per file
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
