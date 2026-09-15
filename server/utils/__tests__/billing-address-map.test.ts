import { describe, expect, it } from 'vitest'
import {
  billingAddressHasContent,
  companyNameSearchPattern,
  flattenCompanyName,
  normalizeMultilineCompanyName,
  resolveDefaultBillingSource,
  snapshotBillingCompanyName,
} from '~/utils/billing-address-map'

describe('resolveDefaultBillingSource', () => {
  it('defaults to the private address when nothing else is defined', () => {
    expect(resolveDefaultBillingSource({})).toBe('private')
    expect(resolveDefaultBillingSource({
      savedBilling: { contact_person: '', street: '', zip: '', city: '' },
    })).toBe('private')
  })

  it('keeps a saved private billing address', () => {
    expect(resolveDefaultBillingSource({
      savedBilling: { contact_person: 'Anna Meier', street: 'Bahnhofstrasse', zip: '8001', city: 'Zürich' },
    })).toBe('private')
  })

  it('keeps a custom saved billing address', () => {
    expect(resolveDefaultBillingSource({
      savedBilling: { company_name: 'Eltern GmbH', street: 'Industrieweg', zip: '8855', city: 'Wangen' },
    })).toBe('custom')
  })

  it('uses the assigned company when no billing snapshot exists', () => {
    expect(resolveDefaultBillingSource({
      linkedCompany: { name: 'Spedition AG' },
    })).toBe('company')
  })

  it('keeps the company snapshot when the saved address is that company', () => {
    expect(resolveDefaultBillingSource({
      linkedCompany: { name: 'Spedition AG' },
      savedBilling: { company_name: 'Spedition AG', street: 'Lagerstrasse' },
    })).toBe('company')
  })

  it('does not overwrite a different defined billing address with the company', () => {
    expect(resolveDefaultBillingSource({
      linkedCompany: { name: 'Spedition AG' },
      savedBilling: { contact_person: 'Anna Meier', street: 'Bahnhofstrasse' },
    })).toBe('private')
  })
})

describe('billingAddressHasContent', () => {
  it('ignores whitespace-only fields', () => {
    expect(billingAddressHasContent({ company_name: '  ', contact_person: ' ' })).toBe(false)
  })
})

describe('normalizeMultilineCompanyName', () => {
  it('preserves an intentional LF', () => {
    expect(normalizeMultilineCompanyName('SBB Kreditoren\nInfrastruktur')).toBe('SBB Kreditoren\nInfrastruktur')
  })

  it('normalizes CRLF and CR to LF', () => {
    expect(normalizeMultilineCompanyName('SBB Kreditoren\r\nInfrastruktur')).toBe('SBB Kreditoren\nInfrastruktur')
    expect(normalizeMultilineCompanyName('SBB Kreditoren\rInfrastruktur')).toBe('SBB Kreditoren\nInfrastruktur')
  })

  it('trims surrounding whitespace without collapsing the LF', () => {
    expect(normalizeMultilineCompanyName('  SBB Kreditoren\nInfrastruktur  ')).toBe('SBB Kreditoren\nInfrastruktur')
  })

  it('leaves a one-line name unchanged', () => {
    expect(normalizeMultilineCompanyName('Stadt Schlieren Werke, Versorgung und Anlagen'))
      .toBe('Stadt Schlieren Werke, Versorgung und Anlagen')
  })
})

describe('flattenCompanyName', () => {
  it('turns LF into a single space', () => {
    expect(flattenCompanyName('SBB Kreditoren\nInfrastruktur')).toBe('SBB Kreditoren Infrastruktur')
  })

  it('does not leave duplicate spaces', () => {
    expect(flattenCompanyName('SBB Kreditoren\n\n  Infrastruktur')).toBe('SBB Kreditoren Infrastruktur')
  })

  it('flattens the existing SBB invoice snapshot', () => {
    expect(flattenCompanyName('Schweizerische Bundesbahn\nSBB Kreditoren Infrastruktur'))
      .toBe('Schweizerische Bundesbahn SBB Kreditoren Infrastruktur')
  })
})

describe('snapshotBillingCompanyName', () => {
  it('preserves LF on write and maps empty to null', () => {
    expect(snapshotBillingCompanyName('SBB Kreditoren\nInfrastruktur')).toBe('SBB Kreditoren\nInfrastruktur')
    expect(snapshotBillingCompanyName('   ')).toBe(null)
  })
})

function ilikeMatch(stored: string, pattern: string): boolean {
  const inner = pattern.replace(/^%/, '').replace(/%$/, '')
  let remaining = stored
  for (const part of inner.split('%').filter(Boolean)) {
    const idx = remaining.toLowerCase().indexOf(part.toLowerCase())
    if (idx < 0) return false
    remaining = remaining.slice(idx + part.length)
  }
  return true
}

describe('companyNameSearchPattern', () => {
  it('matches a stored LF name from a flattened query', () => {
    const stored = 'SBB Kreditoren\nInfrastruktur'
    expect(ilikeMatch(stored, companyNameSearchPattern('SBB Kreditoren'))).toBe(true)
    expect(ilikeMatch(stored, companyNameSearchPattern('SBB Kreditoren Infrastruktur'))).toBe(true)
  })
})
