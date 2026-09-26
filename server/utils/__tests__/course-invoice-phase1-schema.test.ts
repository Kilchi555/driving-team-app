/**
 * Phase 1 course-invoice schema is SQL-only.
 * Live apply is covered by the local fixture when PostgreSQL is available.
 * This file pins the migration text so CI still catches a dropped constraint,
 * a client grant, or a price backfill if that database is absent.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260923_course_invoice_phase1_schema.sql'),
  'utf8',
)

describe('course invoice phase 1 schema', () => {
  it('keeps category automation off and requires lead days only for days_before_start', () => {
    expect(sql).toContain("invoice_timing_mode text NOT NULL DEFAULT 'off'")
    expect(sql).toContain("company_invoicing_mode text NOT NULL DEFAULT 'manual'")
    expect(sql).toContain("late_registration_policy text NOT NULL DEFAULT 'manual'")
    expect(sql).toContain(
      "invoice_timing_mode <> 'days_before_start' OR invoice_lead_days IS NOT NULL",
    )
    expect(sql).toContain('invoice_lead_days >= 0 AND invoice_lead_days <= 365')
  })

  it('rejects negative money and limits currency to CHF without backfilling prices', () => {
    expect(sql).toContain("agreed_currency text NOT NULL DEFAULT 'CHF'")
    expect(sql).toContain("CHECK (agreed_currency = 'CHF')")
    expect(sql).toContain('agreed_net_rappen IS NULL OR agreed_net_rappen >= 0')
    expect(sql).toContain('CHECK (discount_rappen >= 0)')
    expect(sql).toContain('CHECK (voucher_rappen >= 0)')
    expect(sql).toContain('CHECK (credit_applied_rappen >= 0)')
    expect(sql).toContain('agreed_gross_rappen IS NULL OR agreed_gross_rappen >= 0')
    expect(sql).toContain(
      'agreed_gross_rappen = agreed_net_rappen + agreed_vat_rappen - discount_rappen - voucher_rappen',
    )
    expect(sql).not.toMatch(/UPDATE\s+public\.course_registrations/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.invoices/i)
    expect(sql).not.toContain('price_per_participant_rappen')
    expect(sql).not.toMatch(/agreed_(net|gross|vat)_rappen[\s\S]{0,80}amount_paid_rappen/)
  })

  it('extends invoice status with issued and leaves historical statuses in place', () => {
    for (const status of ['draft', 'pdf_created', 'sent', 'paid', 'overdue', 'cancelled', 'issued']) {
      expect(sql).toContain(`'${status}'`)
    }
    expect(sql).toContain("document_role text NOT NULL DEFAULT 'invoice'")
    expect(sql).toContain("document_role IN ('invoice', 'credit_note')")
    expect(sql).toContain('open_amount_rappen integer NOT NULL DEFAULT 0')
    expect(sql).toContain('qr_amount_rappen integer NOT NULL DEFAULT 0')
    expect(sql).toContain('line_kind IS NULL')
    expect(sql).toContain("'credit_application'")
  })

  it('binds one registration to one invoice and keeps anon and authenticated out', () => {
    expect(sql).toContain('UNIQUE (tenant_id, registration_id)')
    expect(sql).toContain('idx_course_invoice_bindings_tenant_invoice')
    expect(sql).toContain('WHERE status IN (\'draft\', \'approved\')')
    expect(sql).toContain('registration_in_open_batch')
    expect(sql).toContain('CHECK (attempt_no BETWEEN 1 AND 4)')
    expect(sql).toContain('1 = first send')
    expect(sql).not.toMatch(/CREATE POLICY/i)
    expect(sql).not.toMatch(/INSERT INTO storage/i)
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain(
      'REVOKE ALL ON TABLE public.course_invoice_bindings FROM PUBLIC, anon, authenticated',
    )
    expect(sql).not.toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_invoice_bindings')
  })

  it('issues through one security-definer function that reuses allocate_invoice_number', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.issue_course_invoice(')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(sql).toContain('public.allocate_invoice_number(p_tenant_id)')
    expect(sql).toContain("'invoice_issued'")
    expect(sql).toContain('unsupported_currency')
    expect(sql).toContain('registration_not_found')
    expect(sql).toContain("payment_status IN ('paid', 'completed')")
    expect(sql).toContain('refunded_amount_rappen')
    expect(sql).toContain('GREATEST(0, v_gross - v_confirmed - v_credit)')
    expect(sql).toContain('WHEN unique_violation THEN')
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM anon, authenticated',
    )
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) TO postgres, service_role',
    )
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.issue_course_invoice[\s\S]*TO authenticated/)
    expect(sql).not.toContain('net.resend')
    expect(sql).not.toContain('INSERT INTO public.payments')
  })

  it('still freezes the pre-existing payment and SARI columns for JWT writers', () => {
    for (const field of [
      'payment_status',
      'payment_id',
      'amount_paid_rappen',
      'payment_method',
      'discount_applied_rappen',
      'sari_data',
      'sari_synced',
      'sari_synced_at',
      'sari_faberid',
      'sari_license_id',
      'sari_licenses',
      'agreed_gross_rappen',
      'price_snapshot_at',
      'credit_applied_rappen',
    ]) {
      expect(sql).toContain(`NEW.${field} := OLD.${field}`)
    }
    expect(sql).toContain("coalesce(auth.role(), '') = 'service_role'")
  })
})
