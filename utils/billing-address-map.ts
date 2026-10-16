export type CompanyAddressSource = {
  id?: string
  name?: string | null
  street?: string | null
  street_nr?: string | null
  street_number?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
  contact_person?: string | null
  vat_number?: string | null
  company_register_number?: string | null
}

export type PersonAddressSource = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_nr?: string | null
  street_number?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  company_name?: string | null
}

export type BillingFormFields = {
  company_name: string
  contact_person: string
  email: string
  phone: string
  street: string
  street_number: string
  zip: string
  city: string
  country: string
  vat_number: string
  company_register_number: string
  notes: string
}

function personName(person?: PersonAddressSource | null): string {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim()
}

function splitPersonName(name?: string | null): { first_name: string; last_name: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

function isCompletePersonName(parts: { first_name: string; last_name: string }): boolean {
  const first = parts.first_name.trim()
  const last = parts.last_name.trim()
  return !!first && !!last && first.toLowerCase() !== last.toLowerCase()
}

/** Prefer a two-part contact name; otherwise the student's first + last name. Avoids "Kilchenmann Kilchenmann". */
export function billingPersonNameParts(
  contactPerson?: string | null,
  person?: { first_name?: string | null; last_name?: string | null; name?: string | null } | null
): { first_name: string; last_name: string } {
  const fromContact = splitPersonName(contactPerson)
  const fromPerson = (person?.first_name || person?.last_name)
    ? {
        first_name: (person?.first_name || '').trim(),
        last_name: (person?.last_name || '').trim(),
      }
    : splitPersonName(person?.name)

  if (isCompletePersonName(fromContact)) return fromContact
  if (isCompletePersonName(fromPerson)) return fromPerson
  if (fromContact.first_name || fromContact.last_name) return fromContact
  return fromPerson
}

export function formatBillingPersonLabel(first?: string | null, last?: string | null): string {
  const f = (first || '').trim()
  const l = (last || '').trim()
  if (f && l && f.toLowerCase() === l.toLowerCase()) return f
  return [f, l].filter(Boolean).join(' ')
}

export function collapseDuplicatePersonName(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  const unique: string[] = []
  for (const part of parts) {
    const prev = unique[unique.length - 1]
    if (!prev || prev.toLowerCase() !== part.toLowerCase()) unique.push(part)
  }
  return unique.join(' ')
}

export function joinStreetAndNumber(street?: string | null, number?: string | null): string {
  const collapsedStreet = collapseDuplicatePersonName(street)
  const collapsedNumber = collapseDuplicatePersonName(number)
  if (!collapsedStreet) return collapsedNumber
  if (!collapsedNumber) return collapsedStreet
  const tokens = collapsedStreet.split(/\s+/)
  if (tokens[tokens.length - 1].toLowerCase() === collapsedNumber.toLowerCase()) return collapsedStreet
  return `${collapsedStreet} ${collapsedNumber}`
}

function addressText(value?: string | null): string {
  return value == null ? '' : String(value)
}

export type InvoicePartyAddress = {
  billing_street: string
  billing_street_number: string
  billing_zip: string
  billing_city: string
}

/** Always replace the previous party address, including a blank house number. */
export function invoicePartyAddress(party: {
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
}): InvoicePartyAddress {
  return {
    billing_street: addressText(party.street),
    billing_street_number: addressText(party.street_nr),
    billing_zip: addressText(party.zip),
    billing_city: addressText(party.city),
  }
}

export function companyInvoiceSearchHit(company: {
  id: string
  name?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
}) {
  const address = invoicePartyAddress(company)
  return {
    id: company.id,
    type: 'company' as const,
    name: company.name || '',
    subtitle: company.contact_person
      ? `${company.contact_person} · ${company.email || ''}`
      : (company.email || ''),
    email: company.email || '',
    phone: company.phone || '',
    contact_person: company.contact_person || '',
    street: address.billing_street,
    street_nr: address.billing_street_number,
    zip: address.billing_zip,
    city: address.billing_city,
  }
}

export function initialCompanySelection(company: {
  id: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
}) {
  return companyInvoiceSearchHit({
    ...company,
    name: company.name,
  })
}

export function privateCustomerSearchHit(user: {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
}) {
  const address = invoicePartyAddress(user)
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return {
    id: user.id,
    type: 'user' as const,
    name,
    subtitle: user.email || '',
    email: user.email || '',
    phone: user.phone || '',
    street: address.billing_street,
    street_nr: address.billing_street_number,
    zip: address.billing_zip,
    city: address.billing_city,
  }
}

/**
 * Canonical invoice column wins. An explicit empty string stays empty.
 * `billing_street_nr` is only the draft/legacy fallback when the column is absent.
 */
export function resolveInvoiceStreetNumber(source: {
  billing_street_number?: string | null
  billing_street_nr?: string | null
}): string {
  if (source.billing_street_number != null) return source.billing_street_number
  return source.billing_street_nr ?? ''
}

export function formatInvoiceStreetLine(source: {
  billing_street?: string | null
  billing_street_number?: string | null
  billing_street_nr?: string | null
}): string {
  return joinStreetAndNumber(source.billing_street, resolveInvoiceStreetNumber(source))
}

export type ViewBillingEditor = {
  company_name: string
  contact_person: string
  street: string
  street_nr: string
  zip: string
  city: string
  email: string
}

export type ViewBillingUpdate = {
  billing_contact_person: string | null
  billing_company_name: string | null
  billing_street: string | null
  billing_street_number: string
  billing_zip: string | null
  billing_city: string | null
  billing_email: string | null
}

/** Load the view-mode editor. Street and house number stay separate. */
export function viewBillingFromInvoice(source: {
  billing_company_name?: string | null
  billing_contact_person?: string | null
  billing_street?: string | null
  billing_street_number?: string | null
  billing_street_nr?: string | null
  billing_zip?: string | null
  billing_city?: string | null
  billing_email?: string | null
}): ViewBillingEditor {
  return {
    company_name: source.billing_company_name || '',
    contact_person: collapseDuplicatePersonName(source.billing_contact_person),
    street: source.billing_street || '',
    street_nr: resolveInvoiceStreetNumber(source),
    zip: source.billing_zip || '',
    city: source.billing_city || '',
    email: source.billing_email || '',
  }
}

export function savedViewBillingBaseline(editor: ViewBillingEditor): ViewBillingEditor {
  return {
    company_name: editor.company_name,
    contact_person: editor.contact_person,
    street: editor.street,
    street_nr: editor.street_nr,
    zip: editor.zip,
    city: editor.city,
    email: editor.email,
  }
}

export function restoreViewBilling(baseline: ViewBillingEditor): ViewBillingEditor {
  return savedViewBillingBaseline(baseline)
}

/**
 * Persist street and house number as separate columns.
 * An explicit empty house number is sent as '' and is not dropped or nulled.
 */
export function viewBillingUpdatePayload(editor: ViewBillingEditor): ViewBillingUpdate {
  return {
    billing_contact_person: editor.contact_person || null,
    billing_company_name: editor.company_name || null,
    billing_street: editor.street || null,
    billing_street_number: editor.street_nr ?? '',
    billing_zip: editor.zip || null,
    billing_city: editor.city || null,
    billing_email: editor.email || null,
  }
}

export function viewBillingSaveErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Fehler beim Speichern der Adresse'
  const record = err as { data?: { statusMessage?: string }; message?: string }
  return record.data?.statusMessage || record.message || 'Fehler beim Speichern der Adresse'
}

function normalizeCountry(country?: string | null): string {
  if (!country || country === 'CH') return 'Schweiz'
  return country
}

/** Canonical company name: keep intentional LF, normalize line endings, trim edges. */
export function normalizeMultilineCompanyName(value?: string | null): string {
  const cleaned = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2028\u2029\u0085\v\f]/g, '\n')
    .replace(/[\u0000-\u0008\u000E-\u001F\u007F]/g, '')
  return cleaned.trim()
}

/** Single-line form for search, QR payload, and list titles. */
export function flattenCompanyName(value?: string | null): string {
  return normalizeMultilineCompanyName(value).replace(/\n+/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

/** Invoice snapshot write: empty after normalize becomes null. */
export function snapshotBillingCompanyName(value?: string | null): string | null {
  return normalizeMultilineCompanyName(value) || null
}

/**
 * Substring search with newline == space. Query spaces stay spaces
 * (`%` / `_` are literal). Empty query matches nothing — callers skip the filter.
 */
export function companyNameMatchesSearch(stored?: string | null, query?: string | null): boolean {
  const needle = flattenCompanyName(query).toLowerCase()
  if (!needle) return false
  return flattenCompanyName(stored).toLowerCase().includes(needle)
}

export function emptyBillingFormFields(): BillingFormFields {
  return {
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    street: '',
    street_number: '',
    zip: '',
    city: '',
    country: 'Schweiz',
    vat_number: '',
    company_register_number: '',
    notes: '',
  }
}

export function billingFieldsFromCompany(
  company: CompanyAddressSource,
  person?: PersonAddressSource | null
): BillingFormFields {
  return {
    company_name: company.name || '',
    contact_person: (company.contact_person || personName(person) || '').trim(),
    email: company.email || person?.email || '',
    phone: company.phone || person?.phone || '',
    street: company.street || '',
    street_number: company.street_nr || company.street_number || '',
    zip: company.zip || '',
    city: company.city || '',
    country: normalizeCountry(company.country),
    vat_number: company.vat_number || '',
    company_register_number: company.company_register_number || '',
    notes: '',
  }
}

export function billingFieldsFromPerson(person: PersonAddressSource): BillingFormFields {
  return {
    company_name: person.company_name || '',
    contact_person: personName(person),
    email: person.email || '',
    phone: person.phone || '',
    street: person.street || '',
    street_number: person.street_nr || person.street_number || '',
    zip: person.zip || '',
    city: person.city || '',
    country: normalizeCountry(person.country),
    vat_number: '',
    company_register_number: '',
    notes: '',
  }
}

export function billingLooksLikeCompany(
  billing: { company_name?: string | null } | null | undefined,
  company: { name?: string | null } | null | undefined
): boolean {
  const billingName = (billing?.company_name || '').trim().toLowerCase()
  const companyName = (company?.name || '').trim().toLowerCase()
  return !!billingName && !!companyName && billingName === companyName
}

export function billingAddressHasContent(addr: {
  company_name?: string | null
  name?: string | null
  contact_person?: string | null
  street?: string | null
  zip?: string | null
  city?: string | null
  email?: string | null
} | null | undefined): boolean {
  if (!addr || typeof addr !== 'object') return false
  return !!(
    (addr.company_name || '').trim() ||
    (addr.name || '').trim() ||
    (addr.contact_person || '').trim() ||
    (addr.street || '').trim() ||
    (addr.zip || '').trim() ||
    (addr.city || '').trim() ||
    (addr.email || '').trim()
  )
}

export type DefaultBillingSource = 'private' | 'company' | 'custom'

/**
 * Invoice default for a newly opened appointment:
 * keep a defined billing source (saved snapshot or assigned company),
 * otherwise use the customer's private address.
 */
export function resolveDefaultBillingSource(input: {
  linkedCompany?: { name?: string | null } | null
  savedBilling?: {
    company_name?: string | null
    name?: string | null
    contact_person?: string | null
    street?: string | null
    zip?: string | null
    city?: string | null
    email?: string | null
  } | null
}): DefaultBillingSource {
  const savedHasContent = billingAddressHasContent(input.savedBilling)
  const savedHasCompanyName = !!(input.savedBilling?.company_name || '').trim()
  const hasLinkedCompany = !!input.linkedCompany
  const savedLooksLikeCompany = billingLooksLikeCompany(input.savedBilling, input.linkedCompany)

  if (hasLinkedCompany && (!savedHasContent || savedLooksLikeCompany)) return 'company'
  if (savedHasContent && !savedHasCompanyName) return 'private'
  if (savedHasContent) return 'custom'
  return 'private'
}
