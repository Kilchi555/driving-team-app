-- One send claim per tenant and public course invoice.
-- Not applied by this change. Do not run against production from the app deploy.
--
-- invoices.status is limited to draft, sent, paid, overdue, cancelled.
-- invoices.sent_at is already the delivery timestamp read by other invoice flows.
-- Neither field can be a pre-SMTP claim without changing those flows.
--
-- The INSERT is the claim. Outcome:
--   claimed      send is in progress or the process stopped before a known result
--   failed       SMTP/API rejected the message; a later call may reclaim
--   sent         invoice status was confirmed sent
--   unconfirmed  SMTP/API accepted the message and the sent update was not confirmed
-- claimed, sent, and unconfirmed must not send again.

CREATE TABLE IF NOT EXISTS public.public_course_invoice_mail_claims (
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  registration_id uuid NOT NULL,
  claim_token uuid NOT NULL,
  outcome text NOT NULL DEFAULT 'claimed',
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_course_invoice_mail_claims_pkey PRIMARY KEY (tenant_id, invoice_id),
  CONSTRAINT public_course_invoice_mail_claims_outcome_chk
    CHECK (outcome IN ('claimed', 'failed', 'sent', 'unconfirmed'))
);

ALTER TABLE public.public_course_invoice_mail_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_course_invoice_mail_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.public_course_invoice_mail_claims TO service_role;
