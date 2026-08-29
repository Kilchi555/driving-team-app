import { billingFieldsFromCompany, type CompanyAddressSource, type PersonAddressSource } from '~/utils/billing-address-map'

export type CompanySearchHit = CompanyAddressSource & {
  id: string
  name: string
}

export function normalizeCompanyName(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function searchCompanies(query = ''): Promise<CompanySearchHit[]> {
  const q = query.trim()
  const res: any = await $fetch('/api/admin/companies', q ? { query: { search: q } } : undefined)
  return res?.companies || []
}

export async function loadCompanyById(id: string): Promise<CompanySearchHit | null> {
  if (!id) return null
  const res: any = await $fetch('/api/admin/companies', { query: { id } })
  return res?.companies?.[0] || null
}

export async function assignCompanyToUser(
  userId: string,
  companyId: string,
  applyBilling = true
) {
  return await $fetch<{ success: boolean; company?: CompanySearchHit }>('/api/admin/companies/assign-user', {
    method: 'POST',
    body: {
      user_id: userId,
      company_id: companyId,
      apply_company_billing: applyBilling,
    },
  })
}

export async function ensureCompanyLinked(opts: {
  userId?: string | null
  companyName?: string | null
  existingCompanyId?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  streetNr?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  vatNumber?: string | null
}): Promise<{ id: string; company: CompanySearchHit | null } | null> {
  const companyName = (opts.companyName || '').trim()
  if (!companyName && !opts.existingCompanyId) return null

  let company: CompanySearchHit | null = null

  if (opts.existingCompanyId) {
    company = await loadCompanyById(opts.existingCompanyId)
    if (company && companyName && normalizeCompanyName(company.name) !== normalizeCompanyName(companyName)) {
      company = null
    }
  }

  if (!company && companyName) {
    const matches = await searchCompanies(companyName)
    company = matches.find(c => normalizeCompanyName(c.name) === normalizeCompanyName(companyName)) || null
  }

  if (!company && companyName) {
    const created: any = await $fetch('/api/admin/companies', {
      method: 'POST',
      body: {
        action: 'create',
        name: companyName,
        contact_person: opts.contactPerson,
        email: opts.email,
        phone: opts.phone,
        street: opts.street,
        street_nr: opts.streetNr,
        zip: opts.zip,
        city: opts.city,
        country: opts.country || 'CH',
        vat_number: opts.vatNumber,
      },
    })
    company = created?.company || null
  }

  if (!company?.id) return null

  if (opts.userId) {
    await assignCompanyToUser(opts.userId, company.id, true)
  }

  return { id: company.id, company }
}

export function companyToBilling(
  company: CompanyAddressSource,
  person?: PersonAddressSource | null
) {
  return billingFieldsFromCompany(company, person)
}
