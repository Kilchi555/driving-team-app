import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, createdBy, name, subject, html_body, text_body } = body

  if (!tenantId || !name || !subject || !html_body) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId, name, subject and html_body are required' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ tenant_id: tenantId, created_by: createdBy || null, name, subject, html_body, text_body: text_body || null })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { template: data }
})
