import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Upserts a reminder_template for the authenticated tenant.
// Body: { id?, channel, stage, language?, subject?, body }
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const body = await readBody(event)
  const { id, channel, stage, language = 'de', subject, body: templateBody } = body

  if (!channel || !stage) {
    throw createError({ statusCode: 400, statusMessage: 'channel and stage are required' })
  }

  const templateData = {
    tenant_id: profile.tenant_id,
    channel,
    stage,
    language,
    subject: channel === 'email' ? (subject ?? null) : null,
    body: templateBody,
    updated_at: new Date().toISOString()
  }

  if (id) {
    const { error } = await supabase
      .from('reminder_templates')
      .update(templateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, id }
  } else {
    const { data, error } = await supabase
      .from('reminder_templates')
      .insert({ ...templateData, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }
})
