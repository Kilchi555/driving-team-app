import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
  const { tenantId } = getQuery(event) as { tenantId: string }

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })
  if (profile.role !== 'super_admin' && tenantId && tenantId !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, tenant_id, name, subject, html_body, text_body, created_by, created_at, updated_at')
    .eq('tenant_id', effectiveTenantId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { templates: data ?? [] }
})
