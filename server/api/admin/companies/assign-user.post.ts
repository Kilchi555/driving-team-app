/**
 * POST /api/admin/companies/assign-user
 * Assigns or removes a user from a company.
 * Body: { user_id, company_id | null }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const { user_id, company_id } = await readBody(event)

  if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })

  // Verify company belongs to tenant (if setting one)
  if (company_id) {
    const { data: company } = await supabase
      .from('companies').select('id').eq('id', company_id).eq('tenant_id', profile.tenant_id).single()
    if (!company) throw createError({ statusCode: 404, statusMessage: 'Firma nicht gefunden' })
  }

  const { error } = await supabase
    .from('users')
    .update({ company_id: company_id || null })
    .eq('id', user_id)
    .eq('tenant_id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
