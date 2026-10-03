import { describe, expect, it } from 'vitest'
import { buildInvoiceEmailHtml } from '../invoice-email'

function html(partial: {
  subtotalRappen?: number
  totalRappen?: number
  vatRate?: number
  vatRappen?: number
  unit?: number
} = {}) {
  const net = partial.subtotalRappen ?? 10000
  const unit = partial.unit ?? net
  return buildInvoiceEmailHtml({
    customerName: 'Ada Kundin',
    invoiceNumber: 'RE-1',
    invoiceDate: '2026-10-03',
    dueDate: '2026-11-02',
    items: [{
      product_name: 'Kurs',
      quantity: 1,
      unit_price_rappen: unit,
      total_price_rappen: unit,
    }],
    subtotalRappen: net,
    totalRappen: partial.totalRappen ?? net,
    vatRate: partial.vatRate,
    vatRappen: partial.vatRappen,
    tenantName: 'Fahrschule',
    staffName: 'Fahrschule',
  })
}

describe('buildInvoiceEmailHtml VAT rows', () => {
  it('leaves other callers unchanged when VAT fields are absent', () => {
    const out = html()
    expect(out).not.toContain('MwSt.')
    expect(out).not.toContain('Netto')
    expect(out).toContain('100.00')
  })

  it('shows net, a zero VAT rate and the gross total', () => {
    const out = html({
      subtotalRappen: 15000,
      vatRate: 0,
      vatRappen: 0,
      totalRappen: 15000,
      unit: 15000,
    })
    expect(out).toContain('Netto')
    expect(out).toContain('CHF 150.00')
    expect(out).toContain('MwSt. (0.0%)')
    expect(out).toContain('CHF 0.00')
    expect(out).toContain('150.00')
  })

  it('shows the passed 8.1 percent VAT amount and gross total', () => {
    const out = html({
      subtotalRappen: 10000,
      vatRate: 8.1,
      vatRappen: 810,
      totalRappen: 10810,
      unit: 10000,
    })
    expect(out).toContain('Netto')
    expect(out).toContain('CHF 100.00')
    expect(out).toContain('MwSt. (8.1%)')
    expect(out).toContain('CHF 8.10')
    expect(out).toContain('108.10')
  })

  it('prints the supplied VAT amount instead of recomputing it', () => {
    const out = html({
      subtotalRappen: 10000,
      vatRate: 8.1,
      vatRappen: 1,
      totalRappen: 10001,
      unit: 10000,
    })
    expect(out).toContain('MwSt. (8.1%)')
    expect(out).toContain('CHF 0.01')
    expect(out).not.toContain('CHF 8.10')
  })
})
