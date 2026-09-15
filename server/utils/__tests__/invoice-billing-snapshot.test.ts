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

  it('flattens LF in the company name for the QR debtor field', () => {
    expect(invoiceQrDebtorName({
      billing_company_name: 'SBB Kreditoren\nInfrastruktur',
    })).toBe('SBB Kreditoren Infrastruktur')

    expect(invoiceQrDebtorName({
      billing_company_name: 'Schweizerische Bundesbahn\nSBB Kreditoren Infrastruktur',
    })).toBe('Schweizerische Bundesbahn SBB Kreditoren Infrastruktur')
  })

  it('does not require mutating the snapshot to flatten', () => {
    const snapshot = 'SBB Kreditoren\nInfrastruktur'
    expect(invoiceQrDebtorName({ billing_company_name: snapshot })).toBe('SBB Kreditoren Infrastruktur')
    expect(snapshot).toBe('SBB Kreditoren\nInfrastruktur')
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
