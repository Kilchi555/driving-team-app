-- Manual sales workspace. Not applied by this change.
-- Superadmin server routes use the service role after an explicit role check.
-- No authenticated or anonymous client can read these rows.
-- Nothing in this schema sends email, SMS, or WhatsApp.

CREATE TABLE IF NOT EXISTS public.sales_pipeline_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL UNIQUE REFERENCES public.fahrlehrer_leads(id) ON DELETE RESTRICT,
  sales_status text NOT NULL DEFAULT 'review_required' CHECK (sales_status IN (
    'new', 'review_required', 'contact_1', 'contacted', 'conversation',
    'demo_booked', 'demo_completed', 'proposal', 'won', 'lost',
    'nurture', 'do_not_contact', 'excluded_existing_tenant'
  )),
  priority text CHECK (priority IS NULL OR priority IN ('P1', 'P2', 'P3', 'P4')),
  engagement_level text CHECK (engagement_level IS NULL OR engagement_level IN ('HOT', 'WARM', 'COLD', 'UNKNOWN')),
  business_potential text,
  size_evidence_confidence text,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  last_contact_channel text CHECK (last_contact_channel IS NULL OR last_contact_channel IN ('phone', 'email', 'sms', 'whatsapp', 'other')),
  next_action text CHECK (next_action IS NULL OR next_action IN ('call', 'email', 'demo', 'proposal', 'nurture', 'none')),
  contact_attempts integer NOT NULL DEFAULT 0 CHECK (contact_attempts >= 0),
  conversation_outcome text,
  current_software text,
  pain_points text,
  interested_features text,
  objections text,
  demo_booked_at timestamptz,
  demo_completed_at timestamptz,
  proposal_sent_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.sales_pipeline_profiles(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.fahrlehrer_leads(id) ON DELETE RESTRICT,
  channel text NOT NULL CHECK (channel IN ('phone', 'email', 'sms', 'whatsapp', 'other')),
  result text NOT NULL CHECK (result IN (
    'no_answer', 'callback_requested', 'conversation', 'interested', 'not_interested',
    'wrong_contact', 'existing_customer', 'do_not_contact', 'demo_requested', 'demo_booked'
  )),
  notes text,
  next_follow_up_at timestamptz,
  next_action text CHECK (next_action IS NULL OR next_action IN ('call', 'email', 'demo', 'proposal', 'nurture', 'none')),
  sales_status text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_pipeline_profiles_follow_up_idx
  ON public.sales_pipeline_profiles (next_follow_up_at);
CREATE INDEX IF NOT EXISTS sales_pipeline_profiles_status_idx
  ON public.sales_pipeline_profiles (sales_status);
CREATE INDEX IF NOT EXISTS sales_contact_logs_prospect_idx
  ON public.sales_contact_logs (prospect_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_sales_pipeline_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_pipeline_profiles_updated_at ON public.sales_pipeline_profiles;
CREATE TRIGGER trg_sales_pipeline_profiles_updated_at
  BEFORE UPDATE ON public.sales_pipeline_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_sales_pipeline_updated_at();

ALTER TABLE public.sales_pipeline_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contact_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sales_pipeline_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sales_contact_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.sales_pipeline_profiles TO service_role;
GRANT ALL ON TABLE public.sales_contact_logs TO service_role;

COMMENT ON TABLE public.sales_pipeline_profiles IS
  'Manual superadmin sales notes for an existing fahrlehrer_leads row. No outreach is sent from this table.';
COMMENT ON TABLE public.sales_contact_logs IS
  'Manual log of a contact a person already made. Inserting a row does not send email, SMS, or WhatsApp.';
