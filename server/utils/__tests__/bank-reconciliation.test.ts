import { describe, it, expect } from 'vitest'
import { matchEntriesToInvoices, type MatchableEntry, type OpenInvoiceForMatching } from '../bank-reconciliation'
import { enrichCsvPaymentFields } from '../csv-parse'

function entry(partial: Partial<MatchableEntry> & Pick<MatchableEntry, 'amount_rappen' | 'reference' | 'remittance_info'>): MatchableEntry {
  return {
    date: '2026-07-21',
    reference_raw: partial.reference,
    debtor_name: '',
    iban: '',
    raw_amount: partial.amount_rappen / 100,
    bank_ref: null,
    dedupe_key: 't',
    ...partial,
  }
}

function inv(partial: Partial<OpenInvoiceForMatching> & Pick<OpenInvoiceForMatching, 'id' | 'invoice_number' | 'total_amount_rappen'>): OpenInvoiceForMatching {
  return {
    payment_status: 'unpaid',
    status: 'sent',
    billing_contact_person: null,
    billing_company_name: null,
    ...partial,
  }
}

describe('matchEntriesToInvoices — ZKB regression', () => {
  const open = [
    inv({ id: 'a', invoice_number: 'RE-2026-0029', total_amount_rappen: 19000, billing_contact_person: 'Laugnor Isljami' }),
    inv({ id: 'b', invoice_number: 'RE-2026-0010', total_amount_rappen: 19000, billing_contact_person: 'Other Person' }),
  ]

  it('matches RE-2026-0029 via remittance despite hyphens', () => {
    const e = entry({
      amount_rappen: 19000,
      reference: '', // no QRR — only remittance text
      remittance_info: 'Rechnung RE-2026-0029 | irgendwas',
      debtor_name: 'Laugnor Isljami',
    })
    const [r] = matchEntriesToInvoices([e], open, '')
    expect(r.invoice_number).toBe('RE-2026-0029')
    expect(r.confidence).toBeGreaterThanOrEqual(90)
    expect(r.match_type).toBe('invoice_number')
  })

  it('matches via QRR containing invoice digits even when generateQRR differs', () => {
    const e = entry({
      amount_rappen: 19000,
      reference: '00000000000000000020260029',
      remittance_info: '', // no invoice number in text
      debtor_name: '',
    })
    const [r] = matchEntriesToInvoices([e], open, 'CH4431999123000889012') // non-QR IBAN → SCOR path
    expect(r.invoice_number).toBe('RE-2026-0029')
    expect(r.confidence).toBeGreaterThanOrEqual(96)
    expect(r.match_type).toBe('exact_ref')
  })

  it('matches stored payment_reference', () => {
    const withStored = [
      inv({
        id: 'a',
        invoice_number: 'RE-2026-0029',
        total_amount_rappen: 19000,
        payment_reference: '00000000000000000020260029',
      }),
    ]
    const e = entry({
      amount_rappen: 19000,
      reference: '00000000000000000020260029',
      remittance_info: '',
    })
    const [r] = matchEntriesToInvoices([e], withStored, '')
    expect(r.confidence).toBeGreaterThanOrEqual(98)
  })

  it('end-to-end: enrich CSV row then match', () => {
    const headers = ['Datum', 'Buchungstext', 'ZKB-Referenz', 'Gutschrift CHF', 'Zahlungszweck', 'Details']
    const row = [
      '21.07.2026',
      'Gutschrift QRR: 00 00000 00000 00000 02026 0029',
      'Z262026200191',
      '190.00',
      'Rechnung RE-2026-0029',
      'Laugnor Isljami, Grossfeldstrasse 8b, 8887 Mels, CH',
    ]
    const enriched = enrichCsvPaymentFields({
      row,
      headers,
      mappedReference: 'Z262026200191',
      mappedDescription: 'Rechnung RE-2026-0029',
      skipHeaderIndexes: [0, 3],
    })
    const e = entry({
      amount_rappen: 19000,
      reference: enriched.reference,
      reference_raw: enriched.reference_raw,
      remittance_info: enriched.remittance_info,
      debtor_name: enriched.debtor_name,
    })
    const [r] = matchEntriesToInvoices([e], open, '')
    expect(enriched.reference).toBe('00000000000000000020260029')
    expect(enriched.debtor_name).toBe('Laugnor Isljami')
    expect(r.invoice_number).toBe('RE-2026-0029')
    expect(r.confidence).toBeGreaterThanOrEqual(90)
  })

  it('matches 25-digit QRR containing invoice digits', () => {
    const e = entry({
      amount_rappen: 19000,
      reference: '0000000000000000020260029',
      remittance_info: '',
    })
    const [r] = matchEntriesToInvoices([e], open, '')
    expect(r.invoice_number).toBe('RE-2026-0029')
    expect(r.confidence).toBeGreaterThanOrEqual(96)
  })

  it('labels amount-only matches as amount_only, not amount_name', () => {
    const e = entry({
      amount_rappen: 60000,
      reference: '',
      remittance_info: 'Einzahlung Noten ZKB Kontokarte Nr. 10409827',
      debtor_name: '',
    })
    const invoices = [
      inv({ id: 'x', invoice_number: 'RE-2026-0016', total_amount_rappen: 60000, billing_contact_person: 'Maliqi Krenar' }),
    ]
    const [r] = matchEntriesToInvoices([e], invoices, '')
    expect(r.match_type).toBe('amount_only')
    expect(r.confidence).toBe(35)
    expect(r.invoice_id).toBeUndefined()
    expect(r.invoice_number).toBeUndefined()
  })
})
