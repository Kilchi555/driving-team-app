import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
  const id = getRouterParam(event, 'id')
  const { tenantId } = getQuery(event) as { tenantId: string }
  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId || !id) throw createError({ statusCode: 400, statusMessage: 'tenantId and id are required' })
  if (profile.role !== 'super_admin' && tenantId && tenantId !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', effectiveTenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
