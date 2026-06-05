import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

const ALLOWED_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'street', 'street_nr', 'zip', 'city'] as const

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'superadmin'])

  const body = await readBody<Partial<Record<typeof ALLOWED_FIELDS[number], string>>>(event)

  const safeUpdates: Record<string, string> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body && body[field] !== undefined) {
      safeUpdates[field] = (body[field] as string).trim()
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Felder zum Aktualisieren' })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('users')
    .update(safeUpdates)
    .eq('id', profile.id)
    .select('*, auth_user_id')
    .single()

  if (error) {
    logger.error('❌ update-profile error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Profil konnte nicht gespeichert werden' })
  }

  // Sync email to Supabase Auth if it changed
  if (safeUpdates.email && data?.auth_user_id) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      data.auth_user_id,
      { email: safeUpdates.email }
    )
    if (authError) {
      logger.warn(`⚠️ Email in users aktualisiert, aber auth.users sync fehlgeschlagen: ${authError.message}`)
    }
  }

  logger.info(`✅ Staff ${profile.id} hat eigenes Profil aktualisiert: ${Object.keys(safeUpdates).join(', ')}`)
  return { success: true, data }
})
