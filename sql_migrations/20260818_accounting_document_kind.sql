-- Beleg-Art (Spesen, Kreditor, Debitor, Vertrag) am Buchungssatz.
-- Verträge sind Ablage, nicht Erfolgskonten.

ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS document_kind text;

UPDATE public.accounting_entries
SET document_kind = CASE
  WHEN type = 'income' THEN 'debtor'
  WHEN submitted_by_user_id IS NOT NULL THEN 'spesen'
  ELSE 'expense'
END
WHERE document_kind IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_entries_document_kind_chk'
  ) THEN
    ALTER TABLE public.accounting_entries
      ADD CONSTRAINT accounting_entries_document_kind_chk
      CHECK (document_kind IS NULL OR document_kind IN ('expense', 'spesen', 'creditor', 'debtor', 'contract'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounting_entries_document_kind_idx
  ON public.accounting_entries (tenant_id, document_kind)
  WHERE deleted_at IS NULL;
