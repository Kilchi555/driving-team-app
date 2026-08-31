import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseExamPassedEmailSettings } from '~/server/utils/exam-passed-email-settings'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'super_admin'])
  const body = await readBody(event)
  const settings = parseExamPassedEmailSettings(body)

  const { error } = await getSupabaseAdmin()
    .from('tenant_settings')
    .upsert({
      tenant_id: profile.tenant_id,
      category: 'exam_passed_emails',
      setting_key: 'config',
      setting_value: JSON.stringify(settings),
      setting_type: 'json',
      updated_by: profile.id,
    }, { onConflict: 'tenant_id,category,setting_key' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Einstellungen konnten nicht gespeichert werden' })
  }

  return { success: true, settings }
})
