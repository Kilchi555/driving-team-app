import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role: string = authUser.role || authUser.profile?.role || ''
  const tenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''

  if (!['admin', 'staff', 'superadmin'].includes(role) || !tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('vehicle_rental_settings, rental_portal_slug')
    .eq('id', tenantId)
    .maybeSingle()

  return {
    success: true,
    settings: tenant?.vehicle_rental_settings ?? {},
    rental_portal_slug: tenant?.rental_portal_slug ?? null,
  }
})
