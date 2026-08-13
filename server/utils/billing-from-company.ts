import type { SupabaseClient } from '@supabase/supabase-js'
import { billingFieldsFromCompany, billingFieldsFromPerson, type CompanyAddressSource, type PersonAddressSource } from '~/utils/billing-address-map'

const BILLING_SELECT = 'id, company_name, contact_person, email, phone, street, street_number, zip, city, country, vat_number, company_register_number'
const COMPANY_SELECT = 'id, name, street, street_nr, zip, city, country, email, phone, contact_person, vat_number, company_register_number'

export type ResolvedBillingAddress = {
  id?: string
  company_name?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_number?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  vat_number?: string | null
  company_register_number?: string | null
}

async function latestActiveBilling(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolvedBillingAddress | null> {
  const { data } = await supabase
    .from('company_billing_addresses')
    .select(BILLING_SELECT)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)

  return data?.[0] || null
}

export async function upsertBillingFromCompany(
  supabase: SupabaseClient,
  opts: {
    userId: string
    tenantId: string
    company: CompanyAddressSource
    student?: PersonAddressSource | null
    createdBy?: string | null
  }
): Promise<{ id: string } | null> {
  const fields = billingFieldsFromCompany(opts.company, opts.student)
  const payload = {
    user_id: opts.userId,
    tenant_id: opts.tenantId,
    company_name: fields.company_name,
    contact_person: fields.contact_person,
    email: fields.email,
    phone: fields.phone || null,
    street: fields.street,
    street_number: fields.street_number || null,
    zip: fields.zip,
    city: fields.city,
    country: fields.country || 'Schweiz',
    vat_number: fields.vat_number || null,
    company_register_number: fields.company_register_number || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  }

  const existing = await latestActiveBilling(supabase, opts.userId)
  let id = existing?.id || null

  if (id) {
    const { error } = await supabase.from('company_billing_addresses').update(payload).eq('id', id)
    if (error) throw error
  } else {
    const { data: inserted, error } = await supabase
      .from('company_billing_addresses')
      .insert({ ...payload, created_by: opts.createdBy || null })
      .select('id')
      .single()
    if (error) throw error
    id = inserted.id
  }

  if (id) {
    await supabase
      .from('users')
      .update({ default_company_billing_address_id: id })
      .eq('id', opts.userId)
  }

  return id ? { id } : null
}

export async function resolveStudentBillingAddress(
  supabase: SupabaseClient,
  student: PersonAddressSource & {
    id: string
    company_id?: string | null
    default_company_billing_address_id?: string | null
  }
): Promise<ResolvedBillingAddress | null> {
  if (student.default_company_billing_address_id) {
    const { data } = await supabase
      .from('company_billing_addresses')
      .select(BILLING_SELECT)
      .eq('id', student.default_company_billing_address_id)
      .eq('is_active', true)
      .maybeSingle()
    if (data) return data
  }

  const latest = await latestActiveBilling(supabase, student.id)
  if (latest) return latest

  if (student.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select(COMPANY_SELECT)
      .eq('id', student.company_id)
      .maybeSingle()

    if (company) {
      const fields = billingFieldsFromCompany(company, student)
      return {
        company_name: fields.company_name,
        contact_person: fields.contact_person,
        email: fields.email,
        phone: fields.phone,
        street: fields.street,
        street_number: fields.street_number,
        zip: fields.zip,
        city: fields.city,
        country: fields.country,
        vat_number: fields.vat_number,
        company_register_number: fields.company_register_number,
      }
    }
  }

  const person = billingFieldsFromPerson(student)
  if (!person.street && !person.zip && !person.city) return null

  return {
    company_name: person.company_name || null,
    contact_person: person.contact_person || null,
    email: person.email || null,
    phone: person.phone || null,
    street: person.street || null,
    street_number: person.street_number || null,
    zip: person.zip || null,
    city: person.city || null,
    country: person.country || null,
  }
}
