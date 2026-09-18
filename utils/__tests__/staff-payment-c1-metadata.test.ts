import { describe, expect, it } from 'vitest'
import {
  EMPTY_INVOICE_SNAPSHOT,
  buildStaffC1PaymentMetadata,
} from '~/utils/staff-payment-c1-metadata'

const UUID_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const UUID_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const STORED_SNAPSHOT = {
  company_name: 'Acme GmbH',
  street: 'Bahnhofstrasse',
  zip: '8001',
  city: 'Zürich',
  country: 'Schweiz',
}
const EDITED_SNAPSHOT = {
  company_name: 'Neu GmbH',
  contact_person: 'Ada',
  email: '',
  phone: '',
  street: 'Limmatquai',
  street_number: '12',
  zip: '8001',
  city: 'Zürich',
  country: 'Schweiz',
}

describe('buildStaffC1PaymentMetadata billing address', () => {
  it('A. known invoice UUID is sent unchanged on a routine edit', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.companyBillingAddressId).toBe(UUID_A)
  })

  it('B. user-changed invoice UUID is sent', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: UUID_B,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.companyBillingAddressId).toBe(UUID_B)
  })

  it('C. explicit clear sends null, not omit', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: null,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(Object.prototype.hasOwnProperty.call(payload, 'companyBillingAddressId')).toBe(true)
    expect(payload.companyBillingAddressId).toBeNull()
  })

  it('D. uninitialized billing id is omitted and must not become null', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: undefined,
      invoiceData: EMPTY_INVOICE_SNAPSHOT,
    })
    expect(payload).not.toHaveProperty('companyBillingAddressId')
    expect(JSON.parse(JSON.stringify(payload))).not.toHaveProperty('companyBillingAddressId')
  })

  it('E. invoice → cash sends explicit null', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'cash',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.companyBillingAddressId).toBeNull()
  })

  it('F. invoice → online/wallee sends explicit null', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'online',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.companyBillingAddressId).toBeNull()
    const wallee = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'wallee',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(wallee.companyBillingAddressId).toBeNull()
  })
})

describe('buildStaffC1PaymentMetadata invoice snapshot', () => {
  it('A. authoritative snapshot is sent on a routine hydrated invoice edit', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.invoiceAddress).toMatchObject({
      company_name: 'Acme GmbH',
      street: 'Bahnhofstrasse',
      zip: '8001',
      city: 'Zürich',
    })
  })

  it('B. user-edited snapshot is sent', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: UUID_A,
      invoiceData: EDITED_SNAPSHOT,
    })
    expect(payload.invoiceAddress).toMatchObject({
      company_name: 'Neu GmbH',
      street: 'Limmatquai',
      street_number: '12',
    })
  })

  it('C. unhydrated default invoiceData is omitted so it cannot overwrite a stored snapshot', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: UUID_A,
      invoiceData: EMPTY_INVOICE_SNAPSHOT,
    })
    expect(payload).not.toHaveProperty('invoiceAddress')
    expect(payload.invoiceAddress).toBeUndefined()
    expect(JSON.parse(JSON.stringify(payload))).not.toHaveProperty('invoiceAddress')
  })

  it('C2. missing invoiceData is omitted', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: undefined,
      invoiceData: undefined,
    })
    expect(payload).not.toHaveProperty('invoiceAddress')
  })

  it('D. invoice → cash clears invoiceAddress', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'cash',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.invoiceAddress).toBeNull()
  })

  it('E. invoice → online/wallee clears invoiceAddress', () => {
    const payload = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'online',
      companyBillingAddressId: UUID_A,
      invoiceData: STORED_SNAPSHOT,
    })
    expect(payload.invoiceAddress).toBeNull()
  })
})
