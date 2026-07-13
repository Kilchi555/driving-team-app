-- Migration: Add 'pdf_created' invoice status
-- Date: 2026-07-13
--
-- Distinguishes "PDF was generated/downloaded by staff" from "Versendet"
-- (actually emailed to the customer). Downloading the PDF from a draft
-- invoice moves it out of "Entwurf" into "PDF erstellt" without implying
-- an email was sent — that still only happens via the explicit send flow,
-- which sets status = 'sent'.

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE invoices
  ADD CONSTRAINT check_status
  CHECK ((status)::text = ANY ((ARRAY[
    'draft'::character varying,
    'pdf_created'::character varying,
    'sent'::character varying,
    'paid'::character varying,
    'overdue'::character varying,
    'cancelled'::character varying
  ])::text[]));
