/**
 * GET  /api/admin/companies        → list all companies for tenant
 * POST /api/admin/companies        → create or update a company
 *   body: { action: 'create'|'update'|'delete', ...fields, id? }
 */
import { defineEventHandler, readBody, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { companyNameMatchesSearch, flattenCompanyName, snapshotBillingCompanyName } from '~/utils/billing-address-map'

/** LIKE/ILIKE literals: `\`, then `%` / `_`. Spaces are never wildcards. */
function escapeIlikeLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&')
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  if (event.method === 'GET') {
    const { search, include_inactive, id } = getQuery(event) as any
    let q = supabase
      .from('companies')
      .select('*, users:users!users_company_id_fkey(id, first_name, last_name, email)')
      .eq('tenant_id', profile.tenant_id)
      .order('name')

    if (!include_inactive) q = q.eq('is_active', true)
    if (id) q = q.eq('id', id)
    const searchFlat = flattenCompanyName(String(search || ''))
    // Candidate prefilter only. First flattened token is a contiguous substring of
    // any name that would pass companyNameMatchesSearch (newlines become spaces, so
    // they cannot sit inside a token). JS match remains the source of truth.
    if (searchFlat) {
      const token = searchFlat.split(' ')[0]
      q = q.ilike('name', `%${escapeIlikeLiteral(token)}%`)
    }

    const { data, error } = await q
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    const companies = searchFlat
      ? (data || []).filter((c: { name?: string | null }) => companyNameMatchesSearch(c.name, searchFlat))
      : (data || [])
    return { success: true, companies }
  }

  const body = await readBody(event)
  const { action, id, name, vat_number, company_register_number, street, street_nr, zip, city, country, email, phone, contact_person, notes, is_active } = body

  if (action === 'delete') {
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
    const { error } = await supabase.from('companies').update({ is_active: false }).eq('id', id).eq('tenant_id', profile.tenant_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  const companyName = snapshotBillingCompanyName(name)
  if (!companyName) throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const payload = {
    tenant_id: profile.tenant_id,
    name: companyName,
    vat_number: vat_number?.trim() || null,
    company_register_number: company_register_number?.trim() || null,
    street: street?.trim() || null,
    street_nr: street_nr?.trim() || null,
    zip: zip?.trim() || null,
    city: city?.trim() || null,
    country: country?.trim() || 'CH',
    email: email?.trim().toLowerCase() || null,
    phone: phone?.trim() || null,
    contact_person: contact_person?.trim() || null,
    notes: notes?.trim() || null,
    is_active: is_active !== false,
    updated_at: new Date().toISOString(),
  }

  if (action === 'update' && id) {
    const { data, error } = await supabase.from('companies').update(payload).eq('id', id).eq('tenant_id', profile.tenant_id).select().single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, company: data }
  }

  const { data, error } = await supabase.from('companies').insert({ ...payload, created_by: profile.id }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, company: data }
})
