import { describe, expect, it } from 'vitest'
import { invoicePersonNames, invoiceQrDebtorName } from '../invoice-billing-snapshot'

describe('invoiceQrDebtorName', () => {
  it('uses the billed company, not the contact person', () => {
    expect(invoiceQrDebtorName({
      billing_company_name: 'Netconstruction GmbH',
      billing_contact_person: 'Maliqi Krenar',
      customer_first_name: 'Krenar',
      customer_last_name: 'Maliqi',
    })).toBe('Netconstruction GmbH')
  })

  it('falls back to contact person, then student, for private invoices', () => {
    expect(invoiceQrDebtorName({
      billing_contact_person: 'Maliqi Krenar',
      customer_first_name: 'Krenar',
      customer_last_name: 'Maliqi',
    })).toBe('Maliqi Krenar')

    expect(invoiceQrDebtorName({
      customer_first_name: 'Krenar',
      customer_last_name: 'Maliqi',
    })).toBe('Krenar Maliqi')
  })

  it('uses draft first/last name when no company is set', () => {
    expect(invoiceQrDebtorName({
      billing_first_name: 'Anna',
      billing_last_name: 'Meier',
    })).toBe('Anna Meier')
  })
})

describe('invoicePersonNames', () => {
  it('keeps contact person for greetings and letters', () => {
    const names = invoicePersonNames({
      billing_contact_person: 'Maliqi Krenar',
      customer_first_name: 'Krenar',
      customer_last_name: 'Maliqi',
    })
    expect(names.customerName).toBe('Maliqi Krenar')
    expect(names.studentName).toBe('Krenar Maliqi')
  })
})
