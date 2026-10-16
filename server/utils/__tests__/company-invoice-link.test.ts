import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ALREADY_LINKED_MESSAGE,
  COMPANY_INVOICE_LINK_ROLES,
  LINK_BLOCKED_MESSAGE,
  NOT_CANDIDATE_MESSAGE,
  assessCompanyInvoiceLink,
  buildCompanyLinkSuggestions,
  invoiceTriggerWouldChangeAmounts,
  parseCompanyInvoiceLinkBody,
  roundedVatRappen,
  type LinkableInvoiceRow,
} from '~/server/utils/company-invoice-link'

const AS_OF = '2026-10-16'
const COMPANY = '525bf160-906c-4886-9284-b6e68eb6195c'
const OTHER = '8d195a31-0fa6-423f-8ef9-e2e893e17e2d'

function row(partial: Partial<LinkableInvoiceRow> = {}): LinkableInvoiceRow {
  return {
    id: '9364490e-7c25-4f4a-a5d6-35b3299fff86',
    tenant_id: '64259d68-195a-4c68-8875-f1b44d962830',
    company_id: null,
    document_kind: 'invoice',
    billing_type: 'company',
    updated_at: '2026-02-09T08:07:35.62906+00:00',
    created_at: '2026-02-09T08:07:35.62906+00:00',
    due_date: '2026-12-31',
    status: 'sent',
    payment_status: 'pending',
    subtotal_rappen: 10000,
    vat_rate: '0.00',
    vat_amount_rappen: 0,
    discount_amount_rappen: 0,
    total_amount_rappen: 10000,
    paid_amount_rappen: 0,
    ...partial,
  }
}

describe('company invoice link decisions', () => {
  it('rounds VAT the way the invoice update trigger does', () => {
    expect(roundedVatRappen(10000, '0.00')).toBe(0)
    expect(roundedVatRappen(10000, '7.70')).toBe(770)
    expect(roundedVatRappen(1210, '7.70')).toBe(93)
    expect(roundedVatRappen(1190, '7.70')).toBe(92)
    expect(roundedVatRappen(50, '1')).toBe(1)
    expect(roundedVatRappen(1, '7.70')).toBe(0)
  })

  it('blocks amount and payment-status changes before any link', () => {
    expect(invoiceTriggerWouldChangeAmounts(row({ vat_amount_rappen: 5 }))).toBe(true)
    const overdue = assessCompanyInvoiceLink(row({ due_date: '2026-01-01' }), row().updated_at || '', AS_OF)
    expect(overdue.ok).toBe(false)
    if (!overdue.ok) expect(overdue.refusal.message).toBe(LINK_BLOCKED_MESSAGE)
    const paidDrift = assessCompanyInvoiceLink(row({ paid_amount_rappen: 10000 }), row().updated_at || '', AS_OF)
    expect(paidDrift.ok).toBe(false)
  })

  it('refuses an existing company, the wrong document, and a stale version', () => {
    const linked = assessCompanyInvoiceLink(row({ company_id: COMPANY }), row().updated_at || '', AS_OF)
    expect(linked.ok).toBe(false)
    if (!linked.ok) expect(linked.refusal.message).toBe(ALREADY_LINKED_MESSAGE)

    const quote = assessCompanyInvoiceLink(row({ document_kind: 'quote' }), row().updated_at || '', AS_OF)
    expect(quote.ok).toBe(false)
    if (!quote.ok) expect(quote.refusal.message).toBe(NOT_CANDIDATE_MESSAGE)

    const individual = assessCompanyInvoiceLink(row({ billing_type: 'individual' }), row().updated_at || '', AS_OF)
    expect(individual.ok).toBe(false)

    const stale = assessCompanyInvoiceLink(row(), '2026-02-09T08:07:35.00000+00:00', AS_OF)
    expect(stale.ok).toBe(false)
    expect(assessCompanyInvoiceLink(row(), row().updated_at || '', AS_OF).ok).toBe(true)
  })

  it('requires an explicit confirmation and rejects payment fields', () => {
    expect(parseCompanyInvoiceLinkBody({
      invoice_id: row().id,
      company_id: COMPANY,
      expected_updated_at: row().updated_at,
      confirm: false,
    }).ok).toBe(false)
    expect(parseCompanyInvoiceLinkBody({
      invoice_id: row().id,
      company_id: COMPANY,
      expected_updated_at: row().updated_at,
      confirm: true,
      payment_status: 'paid',
    }).ok).toBe(false)
    const parsed = parseCompanyInvoiceLinkBody({
      invoice_id: row().id,
      company_id: COMPANY,
      expected_updated_at: row().updated_at,
      confirm: true,
    })
    expect(parsed.ok).toBe(true)
  })

  it('keeps membership and name matches as non-authoritative suggestions', () => {
    const suggestions = buildCompanyLinkSuggestions({
      billingCompanyName: 'Beispiel GmbH',
      invoiceCreatedAt: '2026-02-09T08:07:35.62906+00:00',
      membershipCompanyId: COMPANY,
      companies: [
        { id: COMPANY, name: 'Andere Firma', created_at: '2026-08-13T04:38:59.000Z' },
        { id: OTHER, name: 'Beispiel GmbH', created_at: '2026-01-01T00:00:00.000Z' },
      ],
    })
    expect(suggestions).toHaveLength(2)
    expect(suggestions.every((suggestion) => suggestion.authoritative === false)).toBe(true)
    const membership = suggestions.find((suggestion) => suggestion.company_id === COMPANY)
    expect(membership?.sources).toEqual(['current_membership'])
    expect(membership?.invoice_predates_company).toBe(true)
    expect(suggestions.find((suggestion) => suggestion.company_id === OTHER)?.sources).toEqual(['exact_billing_name'])
  })

  it('does not widen invoice creation or the generic invoice update', () => {
    const createSource = readFileSync(resolve(process.cwd(), 'server/api/invoices/create.post.ts'), 'utf8')
    const allowlist = readFileSync(resolve(process.cwd(), 'server/utils/invoice-update-allowlist.ts'), 'utf8')
    expect(createSource).toContain('company_id: invoiceData.company_id || null')
    expect(createSource).toContain(".eq('tenant_id', tenantId)")
    expect(allowlist).not.toContain("'company_id'")
    expect(COMPANY_INVOICE_LINK_ROLES).toEqual(['admin', 'staff', 'super_admin', 'superadmin'])
  })
})
