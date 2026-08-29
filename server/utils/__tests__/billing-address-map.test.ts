import { describe, expect, it } from 'vitest'
import {
  billingAddressHasContent,
  resolveDefaultBillingSource,
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
