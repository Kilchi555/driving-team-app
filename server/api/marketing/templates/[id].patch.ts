import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, name, subject, html_body, text_body } = body

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId || !id) throw createError({ statusCode: 400, statusMessage: 'tenantId and id are required' })
  if (profile.role !== 'super_admin' && tenantId && tenantId !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (subject !== undefined) updates.subject = subject
  if (html_body !== undefined) updates.html_body = html_body
  if (text_body !== undefined) updates.text_body = text_body

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', effectiveTenantId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { template: data }
})
