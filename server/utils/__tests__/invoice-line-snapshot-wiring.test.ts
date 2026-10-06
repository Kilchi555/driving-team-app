import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Regression guard: create/download/resend/by-payment/persist must use stored
 * snapshots and must not reintroduce live appointment relabeling for service lines.
 */
describe('invoice line snapshot wiring', () => {
  const root = process.cwd()

  it('download presents stored snapshots and does not live-relabel service names', () => {
    const src = readFileSync(resolve(root, 'server/api/invoices/download.post.ts'), 'utf8')
    expect(src).toContain('presentStoredInvoiceLine')
    expect(src).not.toContain('buildInvoiceServiceLineLabel')
    expect(src).not.toContain('eventTypeLabelMap')
  })

  it('resend presents stored snapshots and does not live-relabel service names', () => {
    const src = readFileSync(resolve(root, 'server/api/invoices/resend.post.ts'), 'utf8')
    expect(src).toContain('presentStoredInvoiceLine')
    expect(src).not.toContain('buildInvoiceServiceLineLabel')
    expect(src).not.toContain('eventTypeLabelMap')
  })

  it('by-payment presents stored snapshots and scopes payment/invoice by tenant', () => {
    const src = readFileSync(resolve(root, 'server/api/invoices/by-payment.post.ts'), 'utf8')
    expect(src).toContain('presentStoredInvoiceLine')
    expect(src).toContain(".eq('tenant_id', staffUser.tenant_id)")
    expect(src).not.toContain('buildInvoiceServiceLineLabel')
  })

  it('create strips client snapshot fields and keeps #356 source stamps', () => {
    const src = readFileSync(resolve(root, 'server/api/invoices/create.post.ts'), 'utf8')
    expect(src).toContain('buildServiceLineSnapshot')
    expect(src).toContain('stampInvoiceSourceRow')
    expect(src).toContain('isInvoiceSourceTable')
    expect(src).toContain('customer_first_name: _clientCustomerFirst')
    expect(src).toContain('user_id: _clientUser')
    expect(src).toContain(".eq('tenant_id', tenantId)")
  })

  it('persist-and-send keeps payment claims and writes snapshot columns', () => {
    const src = readFileSync(resolve(root, 'server/utils/invoice-persist-and-send.ts'), 'utf8')
    expect(src).toContain('claimPaymentsForInvoice')
    expect(src).toContain('staff_first_name: item.staff_first_name')
    expect(src).toContain('customer_first_name: item.customer_first_name')
    expect(src).toContain('presentStoredInvoiceLine')
  })

  it('auto-draft freezes student and staff names server-side with tenant filters', () => {
    const src = readFileSync(resolve(root, 'server/api/invoices/auto-draft.post.ts'), 'utf8')
    expect(src).toContain('buildServiceLineSnapshot')
    expect(src).toContain(".eq('tenant_id', staffUser.tenant_id)")
    expect(src).toContain('customer_first_name: snapshot.customer_first_name')
  })
})
