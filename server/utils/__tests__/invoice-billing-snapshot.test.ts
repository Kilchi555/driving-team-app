import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { applyMissingInvoiceBilling, invoicePersonNames, invoiceQrDebtorName } from '../invoice-billing-snapshot'

function asClient(client: { from: (table: string) => unknown }): SupabaseClient {
  return client as unknown as SupabaseClient
}

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

describe('applyMissingInvoiceBilling', () => {
  const complete = {
    user_id: 'user-1',
    billing_street: 'Bahnhofstrasse',
    billing_street_number: '12a',
    billing_zip: '8001',
    billing_city: 'Zürich',
    billing_email: 'anna@example.ch',
  }

  it('does not replace an explicitly empty house number', async () => {
    const invoice = {
      user_id: 'user-1',
      billing_street: 'Bahnhofstrasse',
      billing_street_number: '',
      billing_zip: '8001',
      billing_city: 'Zürich',
      billing_email: 'anna@example.ch',
    }
    const supabase = {
      from() {
        throw new Error('complete postal address must not be reloaded')
      },
    }
    const result = await applyMissingInvoiceBilling(asClient(supabase), 'tenant-1', invoice)
    expect(result).toBe(invoice)
    expect(result.billing_street_number).toBe('')
  })

  it('does not look up a company when the invoice has no user and a street is already set', async () => {
    const invoice = {
      billing_street: 'Bahnhofstrasse',
      billing_street_number: '',
      billing_zip: '8001',
      billing_city: 'Zürich',
      billing_email: 'firma@example.ch',
    }
    const supabase = {
      from() {
        throw new Error('company street_nr must not be injected')
      },
    }
    const result = await applyMissingInvoiceBilling(asClient(supabase), 'tenant-1', invoice)
    expect(result.billing_street).toBe('Bahnhofstrasse')
    expect(result.billing_street_number).toBe('')
  })

  it('leaves an existing snapshot unchanged', async () => {
    const supabase = {
      from() {
        throw new Error('existing snapshot must not be reloaded')
      },
    }
    const result = await applyMissingInvoiceBilling(asClient(supabase), 'tenant-1', complete)
    expect(result).toBe(complete)
  })

  it('fills a missing email without overwriting an explicit blank number', async () => {
    const invoice = {
      user_id: 'user-1',
      billing_street: 'Bahnhofstrasse',
      billing_street_number: '',
      billing_zip: '8001',
      billing_city: 'Zürich',
      billing_email: '',
    }
    const query = {
      select() { return query },
      eq() { return query },
      order() { return query },
      limit() { return Promise.resolve({ data: [] }) },
      maybeSingle() { return Promise.resolve({ data: { id: 'user-1', email: 'anna@example.ch', street_nr: '99' } }) },
    }
    const supabase = { from: () => query }
    const result = await applyMissingInvoiceBilling(asClient(supabase), 'tenant-1', invoice)
    expect(result.billing_email).toBe('anna@example.ch')
    expect(result.billing_street_number).toBe('')
    expect(result.billing_street).toBe('Bahnhofstrasse')
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
