import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { auditCategoryChange } from '~/server/utils/category-write-protection'

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

  // category is an array — validate it separately
  if ('category' in body) {
    const cats = body.category
    if (Array.isArray(cats) && cats.every(c => typeof c === 'string')) {
      safeUpdates.category = cats
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Felder zum Aktualisieren' })
  }

  const supabase = getSupabaseAdmin()

  let previousCategory: unknown
  if ('category' in safeUpdates) {
    const { data: current, error: currentError } = await supabase
      .from('users')
      .select('category')
      .eq('id', profile.id)
      .single()
    if (currentError || !current) {
      logger.error('❌ update-profile could not read current category:', currentError?.message)
      throw createError({ statusCode: 500, statusMessage: 'Profil konnte nicht gespeichert werden' })
    }
    previousCategory = current.category
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

  if ('category' in safeUpdates && Array.isArray(safeUpdates.category)) {
    await auditCategoryChange(supabase, {
      performerId: profile.id,
      targetUserId: profile.id,
      source: 'staff/update-profile',
      oldCategory: previousCategory,
      newCategory: safeUpdates.category
    })
  }

  logger.info(`✅ Staff ${profile.id} hat eigenes Profil aktualisiert: ${Object.keys(safeUpdates).join(', ')}`)
  return { success: true, data }
})
