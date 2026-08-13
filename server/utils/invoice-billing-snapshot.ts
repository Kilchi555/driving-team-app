import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveStudentBillingAddress } from '~/server/utils/billing-from-company'
import { collapseDuplicatePersonName, joinStreetAndNumber } from '~/utils/billing-address-map'

export type InvoiceBillingLike = {
  user_id?: string | null
  billing_street?: string | null
  billing_street_number?: string | null
  billing_street_nr?: string | null
  billing_zip?: string | null
  billing_city?: string | null
  billing_email?: string | null
}

export type UserAddressLike = {
  first_name?: string | null
  last_name?: string | null
  street?: string | null
  street_nr?: string | null
  street_number?: string | null
  zip?: string | null
  city?: string | null
  email?: string | null
}

export function invoicePersonNames(
  invoice: {
    billing_contact_person?: string | null
    customer_first_name?: string | null
    customer_last_name?: string | null
  },
  user?: UserAddressLike | null
): { customerName: string; studentName: string } {
  const studentName = collapseDuplicatePersonName([
    invoice.customer_first_name || user?.first_name,
    invoice.customer_last_name || user?.last_name,
  ].filter(Boolean).join(' '))
  const customerName = collapseDuplicatePersonName(invoice.billing_contact_person) || studentName || 'Kunde'
  return { customerName, studentName }
}

export function joinStreetParts(...parts: Array<string | null | undefined>): string {
  const [street, ...rest] = parts
  return joinStreetAndNumber(street, rest.filter(Boolean).join(' ') || null)
}

export function isPlaceholderBillingEmail(email?: string | null): boolean {
  const value = (email || '').trim().toLowerCase()
  return !value || value === 'keine e-mail'
}

export function invoiceHasPostalAddress(invoice: InvoiceBillingLike): boolean {
  return !!(
    joinStreetParts(invoice.billing_street, invoice.billing_street_number || invoice.billing_street_nr)
    || (invoice.billing_zip || '').trim()
    || (invoice.billing_city || '').trim()
  )
}

export function pdfBillingFields(
  invoice: InvoiceBillingLike,
  user?: UserAddressLike | null
) {
  if (invoiceHasPostalAddress(invoice)) {
    return {
      billingStreet: joinStreetParts(
        invoice.billing_street,
        invoice.billing_street_number || invoice.billing_street_nr
      ),
      billingZip: (invoice.billing_zip || '').trim(),
      billingCity: (invoice.billing_city || '').trim(),
      billingEmail: isPlaceholderBillingEmail(invoice.billing_email)
        ? (user?.email || '')
        : (invoice.billing_email || '').trim(),
    }
  }

  return {
    billingStreet: joinStreetParts(user?.street, user?.street_nr || user?.street_number),
    billingZip: (user?.zip || '').trim(),
    billingCity: (user?.city || '').trim(),
    billingEmail: isPlaceholderBillingEmail(invoice.billing_email)
      ? (user?.email || '')
      : (invoice.billing_email || user?.email || '').trim(),
  }
}

export async function loadUserAddressForInvoice(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  tenantId: string
): Promise<UserAddressLike | null> {
  if (!userId) return null
  const { data } = await supabase
    .from('users')
    .select('first_name, last_name, street, street_nr, zip, city, email')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data
}

export async function applyMissingInvoiceBilling<T extends InvoiceBillingLike>(
  supabase: SupabaseClient,
  tenantId: string,
  invoice: T
): Promise<T> {
  const needsAddress = !invoiceHasPostalAddress(invoice)
  const needsEmail = isPlaceholderBillingEmail(invoice.billing_email)
  if (!needsAddress && !needsEmail) return invoice

  if (!invoice.user_id) {
    return needsEmail ? { ...invoice, billing_email: null } : invoice
  }

  const { data: student } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, street, street_nr, zip, city, country, company_id, default_company_billing_address_id')
    .eq('id', invoice.user_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!student) {
    return needsEmail ? { ...invoice, billing_email: null } : invoice
  }

  const saved = await resolveStudentBillingAddress(supabase, student)
  const next = { ...invoice }

  if (needsAddress) {
    next.billing_street = saved?.street || student.street || null
    next.billing_street_number = saved?.street_number || student.street_nr || null
    next.billing_zip = saved?.zip || student.zip || null
    next.billing_city = saved?.city || student.city || null
  }
  if (needsEmail) {
    next.billing_email = saved?.email || student.email || null
  }

  return next
}
