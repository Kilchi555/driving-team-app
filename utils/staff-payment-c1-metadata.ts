import { billingAddressHasContent } from '~/utils/billing-address-map'

export type StaffC1BillingId = string | null | undefined

export type StaffC1InvoiceData = {
  company_name?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_number?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
} | null | undefined

export type StaffC1PaymentMetadata = {
  companyBillingAddressId?: string | null
  invoiceAddress?: Record<string, string> | null
}

const EMPTY_INVOICE_SNAPSHOT = {
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  street: '',
  street_number: '',
  zip: '',
  city: '',
  country: 'Schweiz',
}

export function isInvoiceStaffPaymentMethod(raw: unknown): boolean {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'invoice' || key === 'rechnung'
}

export function invoiceSnapshotHasAuthoritativeContent(invoiceData: StaffC1InvoiceData): boolean {
  return billingAddressHasContent(invoiceData)
}

function snapshotFromInvoiceData(invoiceData: NonNullable<StaffC1InvoiceData>): Record<string, string> {
  return {
    company_name: invoiceData.company_name || '',
    contact_person: invoiceData.contact_person || '',
    email: invoiceData.email || '',
    phone: invoiceData.phone || '',
    street: invoiceData.street || '',
    street_number: invoiceData.street_number || '',
    zip: invoiceData.zip || '',
    city: invoiceData.city || '',
    country: invoiceData.country || 'Schweiz',
  }
}

/**
 * C1 metadata for POST /api/appointments/save.
 * undefined/omitted = uninitialized (server preserves).
 * null = explicit clear.
 * UUID / snapshot object = persist.
 */
export function buildStaffC1PaymentMetadata(input: {
  paymentMethodRaw: unknown
  companyBillingAddressId: StaffC1BillingId
  invoiceData: StaffC1InvoiceData
}): StaffC1PaymentMetadata {
  if (!isInvoiceStaffPaymentMethod(input.paymentMethodRaw)) {
    return {
      companyBillingAddressId: null,
      invoiceAddress: null,
    }
  }

  const metadata: StaffC1PaymentMetadata = {}

  if (input.companyBillingAddressId !== undefined) {
    const billingId = typeof input.companyBillingAddressId === 'string'
      ? input.companyBillingAddressId.trim()
      : ''
    metadata.companyBillingAddressId = billingId || null
  }

  if (invoiceSnapshotHasAuthoritativeContent(input.invoiceData) && input.invoiceData) {
    metadata.invoiceAddress = snapshotFromInvoiceData(input.invoiceData)
  }

  return metadata
}

export { EMPTY_INVOICE_SNAPSHOT }
