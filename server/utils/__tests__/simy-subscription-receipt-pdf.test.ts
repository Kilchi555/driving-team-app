import { describe, expect, it } from 'vitest'
import {
  localizeInvoiceLineDescription,
  receiptLineFromStripe,
  receiptLinesFromStripe,
} from '~/server/utils/simy-subscription-receipt-pdf'

describe('simy subscription receipt lines', () => {
  it('localizes seats and SMS labels', () => {
    expect(localizeInvoiceLineDescription('2 × Extra Fahrlehrer-Seat (at CHF 19.00 / month)'))
      .toBe('2 × Extra Fahrlehrer-Seat (CHF 19.00 / Mt.)')
    expect(localizeInvoiceLineDescription('0 × Metered SMS Price (at CHF 0.15 / month)'))
      .toContain('SMS-Überzug')
  })

  it('drops zero-amount metered SMS lines', () => {
    expect(receiptLineFromStripe({
      description: '0 × Metered SMS Price (at CHF 0.15 / month)',
      amount: 0,
      quantity: 0,
    })).toBeNull()
  })

  it('does not double quantity in the product name', () => {
    const line = receiptLineFromStripe({
      description: '2 × Extra Fahrlehrer-Seat (at CHF 19.00 / month)',
      amount: 3800,
      quantity: 2,
    })
    expect(line).toEqual({
      product_name: 'Extra Fahrlehrer-Seat (CHF 19.00 / Mt.)',
      quantity: 2,
      unit_price_rappen: 1900,
      total_price_rappen: 3800,
    })
  })

  it('keeps professional plan line', () => {
    const lines = receiptLinesFromStripe([
      { description: '1 × Professional (at CHF 149.00 / month)', amount: 14900, quantity: 1 },
      { description: '0 × Metered SMS Price (at CHF 0.15 / month)', amount: 0, quantity: 0 },
    ])
    expect(lines).toHaveLength(1)
    expect(lines[0].product_name).toContain('Professional')
  })
})
