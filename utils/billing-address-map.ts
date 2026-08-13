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

function normalizeCountry(country?: string | null): string {
  if (!country || country === 'CH') return 'Schweiz'
  return country
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
