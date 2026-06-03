import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { saveCredentialConfig, type CredentialConfig } from './credential-status.get'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single()
  if (caller?.role !== 'super_admin') throw createError({ statusCode: 403, message: 'Super admin only' })

  const body = await readBody(event)
  const config: CredentialConfig = {
    notificationEmail: body.notificationEmail || 'info@simy.ch',
    reminderDaysAhead: Number(body.reminderDaysAhead) || 14,
    intervals: body.intervals || {},
  }

  await saveCredentialConfig(config)
  return { success: true }
})
