import { describe, it, expect } from 'vitest'
import {
  suggestColumnMapping,
  extractPaymentReference,
  extractDebtorName,
  looksLikePaymentReference,
  enrichCsvPaymentFields,
} from '../csv-parse'

describe('suggestColumnMapping (ZKB-style)', () => {
  const zkbHeaders = [
    'Datum', 'Buchungstext', 'Whg', 'Betrag Detail', 'ZKB-Referenz', 'Referenznummer',
    'Belastung CHF', 'Gutschrift CHF', 'Valuta', 'Saldo CHF', 'Zahlungszweck', 'Details',
  ]

  it('maps payment fields, not bank booking ids', () => {
    const m = suggestColumnMapping(zkbHeaders)
    expect(m.date).toBe('Datum')
    expect(m.credit).toBe('Gutschrift CHF')
    expect(m.debit).toBe('Belastung CHF')
    expect(m.transaction_id).toBe('ZKB-Referenz')
    expect(m.reference).toBe('Referenznummer')
    expect(m.description).toBe('Zahlungszweck')
    expect(m.debtor_name).toBe('Details')
  })
})

describe('extractPaymentReference', () => {
  it('extracts QRR from ZKB Buchungstext', () => {
    expect(extractPaymentReference('Gutschrift QRR: 00 00000 00000 00000 02026 0029'))
      .toBe('00000000000000000020260029')
  })

  it('extracts QRR Instant-Zahlung', () => {
    expect(extractPaymentReference('Gutschrift QRR Instant-Zahlung: 00 00000 00076 75010 52701 0422'))
      .toBe('00000000007675010527010422')
  })

  it('ignores bank booking ids', () => {
    expect(looksLikePaymentReference('Z262026200191')).toBe(false)
    expect(looksLikePaymentReference('00000000000000000020260029')).toBe(true)
    expect(looksLikePaymentReference('RF18RE20260029')).toBe(true)
  })
})

describe('extractDebtorName', () => {
  it('parses Auftraggeber prefix', () => {
    expect(extractDebtorName('Gutschrift Auftraggeber: Fahrschule Gemperli, Leuholz 24, 8855 Wangen'))
      .toBe('Fahrschule Gemperli')
  })

  it('parses Details address line', () => {
    expect(extractDebtorName('Laugnor Isljami, Grossfeldstrasse 8b, 8887 Mels, CH'))
      .toBe('Laugnor Isljami')
  })
})

describe('enrichCsvPaymentFields (cross-column)', () => {
  const headers = [
    'Datum', 'Buchungstext', 'ZKB-Referenz', 'Referenznummer',
    'Gutschrift CHF', 'Zahlungszweck', 'Details',
  ]

  it('finds QRR, invoice number and payer across columns', () => {
    const row = [
      '21.07.2026',
      'Gutschrift QRR: 00 00000 00000 00000 02026 0029',
      'Z262026200191',
      '',
      '190.00',
      'Rechnung RE-2026-0029',
      'Laugnor Isljami, Grossfeldstrasse 8b, 8887 Mels, CH',
    ]
    const enriched = enrichCsvPaymentFields({
      row,
      headers,
      mappedReference: 'Z262026200191', // falsch gemappt — soll ignoriert werden
      mappedDescription: 'Rechnung RE-2026-0029',
      mappedDebtorName: '',
      skipHeaderIndexes: [0, 4],
    })
    expect(enriched.reference).toBe('00000000000000000020260029')
    expect(enriched.debtor_name).toBe('Laugnor Isljami')
    expect(enriched.remittance_info).toContain('RE-2026-0029')
    expect(enriched.remittance_info).toContain('QRR')
  })

  it('uses mapped Details as debtor and shortens address', () => {
    const row = [
      '21.07.2026',
      'Gutschrift QRR: 00 00000 00000 00000 02026 0029',
      'Z262026200191',
      '',
      '190.00',
      'Rechnung RE-2026-0029',
      'Laugnor Isljami, Grossfeldstrasse 8b, 8887 Mels, CH',
    ]
    const enriched = enrichCsvPaymentFields({
      row,
      headers,
      mappedDebtorName: 'Laugnor Isljami, Grossfeldstrasse 8b, 8887 Mels, CH',
      skipHeaderIndexes: [0, 4],
    })
    expect(enriched.debtor_name).toBe('Laugnor Isljami')
  })
})
