/**
 * POST /api/admin/companies/assign-user
 * Assigns or removes a user from a company.
 * Body: { user_id, company_id | null, apply_company_billing?: boolean }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { upsertBillingFromCompany } from '~/server/utils/billing-from-company'

const COMPANY_SELECT = 'id, name, street, street_nr, zip, city, country, email, phone, contact_person, vat_number, company_register_number'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, [
    'admin',
    'staff',
    'super_admin',
    'superadmin',
    'tenant_admin',
  ])
  const supabase = getSupabaseAdmin()
  const { user_id, company_id, apply_company_billing } = await readBody(event)

  if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })

  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, first_name, last_name, email, phone')
    .eq('id', user_id)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (userError || !targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })
  }

  const { data: existingBilling } = await supabase
    .from('company_billing_addresses')
    .select('id')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .limit(1)

  const hasExistingBilling = !!(existingBilling && existingBilling.length > 0)

  let company: any = null
  if (company_id) {
    const { data } = await supabase
      .from('companies')
      .select(COMPANY_SELECT)
      .eq('id', company_id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    if (!data) throw createError({ statusCode: 404, statusMessage: 'Firma nicht gefunden' })
    company = data
  }

  const { error } = await supabase
    .from('users')
    .update({ company_id: company_id || null })
    .eq('id', user_id)
    .eq('tenant_id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const shouldApply =
    !!company &&
    (apply_company_billing === true || (apply_company_billing !== false && !hasExistingBilling))

  let billingApplied = false
  if (shouldApply && company) {
    await upsertBillingFromCompany(supabase, {
      userId: user_id,
      tenantId: profile.tenant_id,
      company,
      student: targetUser,
      createdBy: profile.id,
    })
    billingApplied = true
  }

  return {
    success: true,
    has_existing_billing: hasExistingBilling,
    billing_applied: billingApplied,
    company,
  }
})
