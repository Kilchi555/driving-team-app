import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decideInvoiceUpdate } from '../invoice-update-allowlist'

const NOW = '2026-10-15T12:00:00.000Z'
const SENT_AT = '2026-10-15T11:00:00.000Z'

describe('decideInvoiceUpdate', () => {
  it('accepts the send payload from useInvoices', () => {
    const decision = decideInvoiceUpdate({ status: 'sent', sent_at: SENT_AT }, NOW)
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.payload).toEqual({
      status: 'sent',
      sent_at: SENT_AT,
      updated_at: NOW,
    })
  })

  it('accepts cancel with and without a note', () => {
    const withNote = decideInvoiceUpdate({
      status: 'cancelled',
      notes: 'Grund\n\nStorniert am 15.10.2026',
    }, NOW)
    expect(withNote.ok).toBe(true)
    if (withNote.ok) {
      expect(withNote.payload.status).toBe('cancelled')
      expect(withNote.payload.notes).toBe('Grund\n\nStorniert am 15.10.2026')
    }

    const withoutNote = decideInvoiceUpdate({ status: 'cancelled' }, NOW)
    expect(withoutNote.ok).toBe(true)
    if (withoutNote.ok) {
      expect(withoutNote.payload).toEqual({ status: 'cancelled', updated_at: NOW })
    }
  })

  it('accepts the billing payload from InvoicePreviewModal', () => {
    const decision = decideInvoiceUpdate({
      billing_contact_person: null,
      billing_company_name: 'Fahrschule',
      billing_street: 'Weg 1',
      billing_zip: '8000',
      billing_city: 'Zürich',
      billing_email: 'kunde@example.ch',
    }, NOW)
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.payload).toMatchObject({
      billing_contact_person: null,
      billing_company_name: 'Fahrschule',
      billing_email: 'kunde@example.ch',
    })
    expect(decision.payload).not.toHaveProperty('payment_status')
    expect(decision.payload).not.toHaveProperty('paid_amount_rappen')
    expect(decision.payload).not.toHaveProperty('paid_at')
  })

  it('rejects payment_status pending and does not return a write payload', () => {
    const decision = decideInvoiceUpdate({
      status: 'sent',
      sent_at: SENT_AT,
      payment_status: 'pending',
    }, NOW)
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.statusCode).toBe(400)
    expect(decision.statusMessage).toContain('payment_status')
    expect(decision.rejectedFields).toEqual(['payment_status'])
    expect(decision).not.toHaveProperty('payload')
  })

  it('rejects paid_amount_rappen and paid_at', () => {
    const decision = decideInvoiceUpdate({
      paid_amount_rappen: 0,
      paid_at: null,
    }, NOW)
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.statusCode).toBe(400)
    expect(decision.statusMessage).toContain('paid_amount_rappen')
    expect(decision.statusMessage).toContain('paid_at')
    expect(decision.rejectedFields).toEqual(['paid_amount_rappen', 'paid_at'])
  })

  it('rejects ownership, totals, and other accounting fields', () => {
    const decision = decideInvoiceUpdate({
      tenant_id: '22222222-2222-2222-2222-222222222222',
      user_id: '33333333-3333-3333-3333-333333333333',
      total_amount_rappen: 1,
      subtotal_rappen: 1,
      payment_method: 'cash',
      credit_applied_rappen: 500,
      dunning_level: 0,
      document_kind: 'quote',
    }, NOW)
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.statusCode).toBe(400)
    expect(decision.rejectedFields).toEqual([
      'tenant_id',
      'user_id',
      'total_amount_rappen',
      'subtotal_rappen',
      'payment_method',
      'credit_applied_rappen',
      'dunning_level',
      'document_kind',
    ])
  })

  it('rejects status paid and other invoice statuses', () => {
    for (const status of ['paid', 'draft', 'overdue', 'pdf_created', 'pending']) {
      const decision = decideInvoiceUpdate({ status }, NOW)
      expect(decision.ok).toBe(false)
      if (decision.ok) return
      expect(decision.statusMessage).toContain('status must be sent or cancelled')
    }
  })

  it('rejects an invalid email without accepting the surrounding address fields', () => {
    const decision = decideInvoiceUpdate({
      billing_city: 'Zürich',
      billing_email: 'not-an-email',
    }, NOW)
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.statusMessage).toContain('billing_email')
  })

  it('does not spread caller fields in the update route', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/invoices/update.post.ts'), 'utf8')
    expect(src).not.toContain('...updates')
    expect(src).toContain('decideInvoiceUpdate')
    expect(src).toContain(".eq('tenant_id', staffUser.tenant_id)")
  })
})
