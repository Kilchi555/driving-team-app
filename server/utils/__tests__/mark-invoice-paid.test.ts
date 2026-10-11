import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MarkInvoicePaidError,
  assertMarkInvoicePaidRole,
  buildMarkInvoicePaidAuditDetails,
  computePaidTotals,
  isProviderLikePaymentMethod,
  normalizePaymentMethodLabel,
  planCourseRegistrationPaySync,
  resolveSettlementSource,
} from '../mark-invoice-paid'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('mark-invoice-paid authorization helpers', () => {
  it('allows admin and tenant_admin only', () => {
    expect(() => assertMarkInvoicePaidRole('admin')).not.toThrow()
    expect(() => assertMarkInvoicePaidRole('tenant_admin')).not.toThrow()
    expect(() => assertMarkInvoicePaidRole('staff')).toThrow(MarkInvoicePaidError)
    expect(() => assertMarkInvoicePaidRole('client')).toThrow(MarkInvoicePaidError)
    expect(() => assertMarkInvoicePaidRole(null)).toThrow(MarkInvoicePaidError)
  })
})

describe('settlement source resolution', () => {
  it('treats CAMT/CSV dedupe as technically verified bank import', () => {
    const result = resolveSettlementSource({
      camtDedupeKey: 'dedupe-1',
      paymentMethod: 'wallee',
      manualPaymentAttested: false,
    })
    expect(result).toEqual({ source: 'bank_import', technicallyVerified: true })
  })

  it('rejects provider-like methods without bank import', () => {
    expect(() =>
      resolveSettlementSource({
        paymentMethod: 'wallee',
        manualPaymentAttested: true,
      }),
    ).toThrow(/Online-\/Provider/)
    expect(isProviderLikePaymentMethod('stripe')).toBe(true)
    expect(isProviderLikePaymentMethod('Bar')).toBe(false)
  })

  it('requires explicit manual attestation for offline methods', () => {
    expect(() =>
      resolveSettlementSource({
        paymentMethod: 'Bar',
        manualPaymentAttested: false,
      }),
    ).toThrow(/ausdrückliche Bestätigung/)

    expect(
      resolveSettlementSource({
        paymentMethod: 'Bar',
        manualPaymentAttested: true,
      }),
    ).toEqual({ source: 'manual_attestation', technicallyVerified: false })
  })
})

describe('paid totals', () => {
  it('computes full and partial payments without inventing amounts', () => {
    expect(
      computePaidTotals({
        invoiceTotalRappen: 25000,
        previouslyPaidRappen: 0,
        requestedPaymentRappen: 25000,
      }),
    ).toEqual({ newPaymentRappen: 25000, clampedTotalRappen: 25000, isPartial: false })

    expect(
      computePaidTotals({
        invoiceTotalRappen: 25000,
        previouslyPaidRappen: 10000,
        requestedPaymentRappen: 5000,
      }),
    ).toEqual({ newPaymentRappen: 5000, clampedTotalRappen: 15000, isPartial: true })
  })

  it('does not claim full payment on already-paid invoices', () => {
    expect(() =>
      computePaidTotals({
        invoiceTotalRappen: 25000,
        previouslyPaidRappen: 25000,
        requestedPaymentRappen: 100,
      }),
    ).toThrow(/bereits vollständig/)
  })

  it('clamps overpayment to remaining balance', () => {
    expect(
      computePaidTotals({
        invoiceTotalRappen: 25000,
        previouslyPaidRappen: 20000,
        requestedPaymentRappen: 99999,
      }),
    ).toEqual({ newPaymentRappen: 5000, clampedTotalRappen: 25000, isPartial: false })
  })
})

describe('course registration sync plan', () => {
  const tenantId = 'tenant-1'
  const invoiceId = 'inv-1'

  it('syncs exactly one linked registration on full payment', () => {
    expect(
      planCourseRegistrationPaySync({
        isPartial: false,
        clampedTotalRappen: 25000,
        tenantId,
        invoiceId,
        registrations: [{ id: 'reg-1', tenant_id: tenantId, invoice_id: invoiceId }],
      }),
    ).toEqual({
      action: 'sync',
      registrationId: 'reg-1',
      amountPaidRappen: 25000,
      paymentStatus: 'paid',
    })
  })

  it('does not mark registration paid on partial payment', () => {
    expect(
      planCourseRegistrationPaySync({
        isPartial: true,
        clampedTotalRappen: 10000,
        tenantId,
        invoiceId,
        registrations: [{ id: 'reg-1', tenant_id: tenantId, invoice_id: invoiceId }],
      }),
    ).toEqual({ action: 'none', reason: 'partial' })
  })

  it('allows invoices with no course registration', () => {
    expect(
      planCourseRegistrationPaySync({
        isPartial: false,
        clampedTotalRappen: 25000,
        tenantId,
        invoiceId,
        registrations: [],
      }),
    ).toEqual({ action: 'none', reason: 'no_registration' })
  })

  it('fails closed on ambiguous registration links', () => {
    expect(() =>
      planCourseRegistrationPaySync({
        isPartial: false,
        clampedTotalRappen: 25000,
        tenantId,
        invoiceId,
        registrations: [
          { id: 'reg-1', tenant_id: tenantId, invoice_id: invoiceId },
          { id: 'reg-2', tenant_id: tenantId, invoice_id: invoiceId },
        ],
      }),
    ).toThrow(/Mehrere Kursanmeldungen/)
  })

  it('ignores foreign-tenant registration rows', () => {
    expect(
      planCourseRegistrationPaySync({
        isPartial: false,
        clampedTotalRappen: 25000,
        tenantId,
        invoiceId,
        registrations: [{ id: 'reg-x', tenant_id: 'other', invoice_id: invoiceId }],
      }),
    ).toEqual({ action: 'none', reason: 'no_registration' })
  })
})

describe('audit details', () => {
  it('records actor-independent settlement metadata without claiming cash ledger writes', () => {
    expect(
      buildMarkInvoicePaidAuditDetails({
        settlementSource: 'manual_attestation',
        technicallyVerified: false,
        paymentMethod: 'Bar',
        newPaymentRappen: 25000,
        clampedTotalRappen: 25000,
        isPartial: false,
        courseRegistrationId: 'reg-1',
      }),
    ).toMatchObject({
      settlement_source: 'manual_attestation',
      technically_verified: false,
      cash_ledger_written: false,
      course_registration_id: 'reg-1',
    })
  })
})

describe('normalizePaymentMethodLabel', () => {
  it('falls back to manual', () => {
    expect(normalizePaymentMethodLabel(undefined, undefined)).toBe('manual')
    expect(normalizePaymentMethodLabel('Bar', undefined)).toBe('Bar')
  })
})

describe('handler wiring (source contract)', () => {
  const src = read('server/api/invoices/mark-invoice-paid.post.ts')
  const ui = read('components/admin/InvoiceDetailModal.vue')
  const migration = read('migrations/20261011_mark_invoice_paid_core.sql')

  it('keeps tenant-scoped invoice load and staff-pos credit after full payment', () => {
    expect(src).toContain(".eq('tenant_id', staffUser.tenant_id)")
    expect(src).toContain(".eq('tenant_id', invoice.tenant_id)")
    expect(src).toContain('applyStaffPosCreditsForPaidInvoice')
    expect(src.indexOf('if (!totals.isPartial)')).toBeLessThan(src.indexOf('await applyStaffPosCreditsForPaidInvoice'))
    expect(src).toContain('applyInvoiceCreditOnPaid')
  })

  it('requires settlement resolution and audit logging', () => {
    expect(src).toContain('resolveSettlementSource')
    expect(src).toContain('planCourseRegistrationPaySync')
    expect(src).toContain("action: 'mark_invoice_paid'")
    expect(src).toContain('logAudit')
    expect(src).toContain('manual_payment_attested')
    expect(src).not.toContain("from('cash_transactions')")
  })

  it('uses atomic core RPC when available and optimistic concurrency in fallback', () => {
    expect(src).toContain("rpc('mark_invoice_paid_core'")
    expect(src).toContain(".eq('paid_amount_rappen', invoice.paid_amount_rappen || 0)")
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.mark_invoice_paid_core')
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain("payment_status = 'paid'")
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.mark_invoice_paid_core')
    expect(migration).toContain('service_role')
  })

  it('UI requires attestation and does not claim technical verification', () => {
    expect(ui).toContain('manualPaymentAttested')
    expect(ui).toContain('manual_payment_attested: true')
    expect(ui).toContain('keine technische Verifikation')
    expect(ui).toContain('!manualPaymentAttested')
  })
})
