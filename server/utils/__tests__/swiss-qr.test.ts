import { describe, expect, it } from 'vitest'
import { buildSwissQRData } from '../swiss-qr'

const BASE = {
  qr_iban: 'CH4431999123000889012',
  creditor_name: 'Simy GmbH',
  creditor_street: 'Bahnstrasse',
  creditor_street_nr: '1',
  creditor_zip: '8000',
  creditor_city: 'Zürich',
  debtor_street: 'Poststrasse',
  debtor_street_nr: '6',
  debtor_zip: '3000',
  debtor_city: 'Bern',
  amount_rappen: 114000,
  invoice_number: 'RE-2026-0075',
}

function debtorNameFromPayload(payload: string): string {
  const lines = payload.split('\r\n')
  return lines[21] || ''
}

describe('buildSwissQRData debtor name', () => {
  it('strips LF from the debtor name field', () => {
    const payload = buildSwissQRData({
      ...BASE,
      debtor_name: 'SBB Kreditoren\nInfrastruktur',
    })
    const debtor = debtorNameFromPayload(payload)
    expect(debtor).toBe('SBB Kreditoren Infrastruktur')
    expect(debtor).not.toMatch(/\n/)
    expect(debtor).not.toMatch(/\r/)
  })

  it('strips CRLF and CR', () => {
    expect(debtorNameFromPayload(buildSwissQRData({
      ...BASE,
      debtor_name: 'SBB Kreditoren\r\nInfrastruktur',
    }))).toBe('SBB Kreditoren Infrastruktur')

    expect(debtorNameFromPayload(buildSwissQRData({
      ...BASE,
      debtor_name: 'SBB Kreditoren\rInfrastruktur',
    }))).toBe('SBB Kreditoren Infrastruktur')
  })

  it('keeps the payload field count stable when the name had an LF', () => {
    const payload = buildSwissQRData({
      ...BASE,
      debtor_name: 'SBB Kreditoren\nInfrastruktur',
    })
    expect(payload.split('\r\n').length).toBe(
      buildSwissQRData({ ...BASE, debtor_name: 'SBB Kreditoren Infrastruktur' }).split('\r\n').length
    )
  })
})
