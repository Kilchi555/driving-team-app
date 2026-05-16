import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, name, subject, html_body, text_body } = body

  if (!tenantId || !id) throw createError({ statusCode: 400, statusMessage: 'tenantId and id are required' })

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
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { template: data }
})
