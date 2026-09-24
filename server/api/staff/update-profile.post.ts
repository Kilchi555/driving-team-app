import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { selectPersistableLeafCodes } from '~/utils/category-leaf'
import { logger } from '~/utils/logger'

const ALLOWED_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'street', 'street_nr', 'zip', 'city'] as const

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'superadmin', 'super_admin'])

  const body = await readBody<Partial<Record<typeof ALLOWED_FIELDS[number], string>> & { category?: string[] }>(event)

  const safeUpdates: Record<string, any> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body && body[field] !== undefined) {
      safeUpdates[field] = (body[field] as string).trim()
    }
  }

  const supabase = getSupabaseAdmin()

  if ('category' in body) {
    const requested = body.category
    if (!Array.isArray(requested) || requested.some((code) => typeof code !== 'string' || code.trim().length === 0)) {
      throw createError({ statusCode: 400, statusMessage: 'Kategorien müssen eine Liste von Codes sein' })
    }

    if (requested.length === 0) {
      safeUpdates.category = []
    } else {
      const { data: categoryRows, error: categoryError } = await supabase
        .from('categories')
        .select('id, code, parent_category_id, tenant_id, is_active')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)

      if (categoryError) {
        logger.error('❌ update-profile category lookup error:', categoryError.message)
        throw createError({ statusCode: 500, statusMessage: 'Kategorien konnten nicht geprüft werden' })
      }

      const decision = selectPersistableLeafCodes(requested, categoryRows || [], profile.tenant_id)
      if (!decision.ok) {
        throw createError({ statusCode: 400, statusMessage: decision.statusMessage })
      }
      safeUpdates.category = decision.codes
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Felder zum Aktualisieren' })
  }

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
