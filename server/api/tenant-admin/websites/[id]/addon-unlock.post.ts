// POST /api/tenant-admin/websites/[id]/addon-unlock
// Superadmin toggles addon_pages_enabled on website_tenants

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const tenantId = getRouterParam(event, 'id')
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenant id required' })
  }

  const body = await readBody(event)
  const enabled = body?.enabled === true

  const supabase = getSupabaseAdmin()
  const { data: actor } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  const role = String(actor?.role || '')
  if (role !== 'super_admin' && role !== 'superadmin') {
    throw createError({ statusCode: 403, statusMessage: 'Superadmin only' })
  }

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, addon_pages_enabled')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found for tenant' })
  }

  const { data: updated, error } = await supabase
    .from('website_tenants')
    .update({
      addon_pages_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', website.id)
    .select('id, addon_pages_enabled')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, addon_pages_enabled: !!updated.addon_pages_enabled }
})
