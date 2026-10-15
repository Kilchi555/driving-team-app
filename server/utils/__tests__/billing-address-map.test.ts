import { describe, expect, it } from 'vitest'
import {
  billingAddressHasContent,
  companyInvoiceSearchHit,
  companyNameMatchesSearch,
  flattenCompanyName,
  formatInvoiceStreetLine,
  initialCompanySelection,
  invoicePartyAddress,
  normalizeMultilineCompanyName,
  privateCustomerSearchHit,
  resolveDefaultBillingSource,
  resolveInvoiceStreetNumber,
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

describe('companyNameMatchesSearch', () => {
  const storedLf = 'SBB Kreditoren\nInfrastruktur'

  it('treats newline as a space for substring search', () => {
    expect(flattenCompanyName(storedLf)).toBe('SBB Kreditoren Infrastruktur')
    expect(companyNameMatchesSearch(storedLf, 'SBB')).toBe(true)
    expect(companyNameMatchesSearch(storedLf, 'SBB Kreditoren')).toBe(true)
    expect(companyNameMatchesSearch(storedLf, 'SBB Kreditoren Infrastruktur')).toBe(true)
    expect(companyNameMatchesSearch(storedLf, 'Kreditoren Infrastruktur')).toBe(true)
  })

  it('does not treat query spaces as arbitrary wildcards', () => {
    expect(companyNameMatchesSearch('SBB ABC Kreditoren', 'SBB Kreditoren')).toBe(false)
    expect(companyNameMatchesSearch(storedLf, 'SBB ABC')).toBe(false)
    expect(companyNameMatchesSearch(storedLf, 'SBB ABC Kreditoren')).toBe(false)
  })

  it('treats % and _ as literal characters, not SQL wildcards', () => {
    expect(companyNameMatchesSearch('SBB ABC Kreditoren', 'SBB%Kreditoren')).toBe(false)
    expect(companyNameMatchesSearch('SBB Kreditoren', 'SBB_Kreditoren')).toBe(false)
    expect(companyNameMatchesSearch('SBB%Kreditoren', 'SBB%Kreditoren')).toBe(true)
  })

  it('is case-insensitive and collapses extra spaces', () => {
    expect(companyNameMatchesSearch(storedLf, 'sbb kreditoren')).toBe(true)
    expect(companyNameMatchesSearch(storedLf, 'SBB  Kreditoren')).toBe(true)
  })

  it('keeps ordinary substring semantics', () => {
    expect(companyNameMatchesSearch('SBB Kreditoren', 'BB')).toBe(true)
  })

  it('keeps a matching query first token as a contiguous substring of the stored name', () => {
    const queries = [
      'SBB',
      'SBB Kreditoren',
      'SBB Kreditoren Infrastruktur',
      'Kreditoren Infrastruktur',
      'sbb kreditoren',
      'SBB  Kreditoren',
    ]
    for (const query of queries) {
      expect(companyNameMatchesSearch(storedLf, query)).toBe(true)
      const token = flattenCompanyName(query).split(' ')[0]
      expect(token.length).toBeGreaterThan(0)
      expect(storedLf.toLowerCase()).toContain(token.toLowerCase())
    }
  })
})

describe('company invoice house number', () => {
  it('keeps street_nr on a company search result', () => {
    expect(companyInvoiceSearchHit({
      id: 'co-1',
      name: 'Muster AG',
      street: 'Bahnhofstrasse',
      street_nr: '12a',
      zip: '8001',
      city: 'Zürich',
    })).toMatchObject({ street: 'Bahnhofstrasse', street_nr: '12a', zip: '8001', city: 'Zürich' })
  })

  it('sets billing_street_number from company number 12', () => {
    expect(invoicePartyAddress({ street: 'Bahnhofstrasse', street_nr: '12', zip: '8001', city: 'Zürich' }))
      .toMatchObject({ billing_street: 'Bahnhofstrasse', billing_street_number: '12' })
  })

  it('preserves the suffix 12a exactly', () => {
    expect(invoicePartyAddress({ street: 'Bahnhofstrasse', street_nr: '12a' }).billing_street_number).toBe('12a')
  })

  it('clears the previous number when the next company has none', () => {
    const withNumber = invoicePartyAddress({ street: 'Bahnhofstrasse', street_nr: '12', zip: '8001', city: 'Zürich' })
    const cleared = invoicePartyAddress({ street: 'Industrieweg', street_nr: null, zip: '8400', city: 'Winterthur' })
    expect(withNumber.billing_street_number).toBe('12')
    expect(cleared.billing_street_number).toBe('')
    expect(cleared.billing_street).toBe('Industrieweg')
  })

  it('does not carry a house number from one company to the next', () => {
    const form = {
      billing_street: '',
      billing_street_number: '',
      billing_zip: '',
      billing_city: '',
    }
    Object.assign(form, invoicePartyAddress({ street: 'Bahnhofstrasse', street_nr: '12', zip: '8001', city: 'Zürich' }))
    expect(form.billing_street_number).toBe('12')
    Object.assign(form, invoicePartyAddress({ street: 'Seestrasse', street_nr: '12a', zip: '8002', city: 'Zürich' }))
    expect(form.billing_street_number).toBe('12a')
    Object.assign(form, invoicePartyAddress({ street: 'Industrieweg', street_nr: null, zip: '8400', city: 'Winterthur' }))
    expect(form.billing_street).toBe('Industrieweg')
    expect(form.billing_street_number).toBe('')
  })

  it('keeps the house number from the company directory entry', () => {
    const selected = initialCompanySelection({
      id: 'co-1',
      name: 'Muster AG',
      street: 'Bahnhofstrasse',
      street_nr: '12a',
      zip: '8001',
      city: 'Zürich',
    })
    expect(selected.street_nr).toBe('12a')
    expect(invoicePartyAddress(selected).billing_street_number).toBe('12a')
  })
})

describe('private customer invoice address', () => {
  it('copies the searched address onto the invoice form', () => {
    const hit = privateCustomerSearchHit({
      id: 'user-1',
      first_name: 'Anna',
      last_name: 'Meier',
      email: 'anna@example.ch',
      street: 'Bahnhofstrasse',
      street_nr: '12',
      zip: '8001',
      city: 'Zürich',
    })
    expect(hit).toMatchObject({
      street: 'Bahnhofstrasse',
      street_nr: '12',
      zip: '8001',
      city: 'Zürich',
    })
    expect(invoicePartyAddress(hit)).toMatchObject({
      billing_street: 'Bahnhofstrasse',
      billing_street_number: '12',
      billing_zip: '8001',
      billing_city: 'Zürich',
    })
  })
})

describe('invoice street line', () => {
  it('renders the canonical billing_street_number', () => {
    expect(formatInvoiceStreetLine({
      billing_street: 'Bahnhofstrasse',
      billing_street_number: '12',
      billing_street_nr: '99',
    })).toBe('Bahnhofstrasse 12')
    expect(resolveInvoiceStreetNumber({
      billing_street_number: '12a',
      billing_street_nr: '4',
    })).toBe('12a')
  })

  it('uses billing_street_nr only when the canonical number is absent', () => {
    expect(formatInvoiceStreetLine({
      billing_street: 'Bahnhofstrasse',
      billing_street_nr: '12a',
    })).toBe('Bahnhofstrasse 12a')
    expect(formatInvoiceStreetLine({
      billing_street: 'Bahnhofstrasse',
      billing_street_number: '',
      billing_street_nr: '12',
    })).toBe('Bahnhofstrasse')
  })

  it('does not duplicate a number already embedded in the street', () => {
    expect(formatInvoiceStreetLine({
      billing_street: 'Bahnhofstrasse 12',
      billing_street_number: '12',
    })).toBe('Bahnhofstrasse 12')
    expect(formatInvoiceStreetLine({
      billing_street: 'Bahnhofstrasse 12a',
      billing_street_number: '12a',
    })).toBe('Bahnhofstrasse 12a')
  })

  it('keeps a differing suffix', () => {
    expect(formatInvoiceStreetLine({
      billing_street: 'Bahnhofstrasse 12',
      billing_street_number: '12a',
    })).toBe('Bahnhofstrasse 12 12a')
  })
})
