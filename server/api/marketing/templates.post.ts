import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const body = await readBody(event)
  const { tenantId, createdBy, name, subject, html_body, text_body } = body

  if (!name || !subject || !html_body) {
    throw createError({ statusCode: 400, statusMessage: 'name, subject and html_body are required' })
  }

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })
  }

  if (
    profile.role !== 'super_admin' &&
    tenantId &&
    tenantId !== profile.tenant_id
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      tenant_id: effectiveTenantId,
      created_by: createdBy || profile.id || null,
      name,
      subject,
      html_body,
      text_body: text_body || null,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { template: data }
})
