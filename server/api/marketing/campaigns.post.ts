import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, createdBy, name, template_id, subject_override, segment_filter = {} } = body

  if (!tenantId || !name || !template_id) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId, name and template_id are required' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({
      tenant_id: tenantId,
      created_by: createdBy || null,
      name,
      template_id,
      subject_override: subject_override || null,
      segment_filter,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { campaign: data }
})
