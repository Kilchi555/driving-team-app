import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * POST /api/appointments/apply-discount
 * PR-A C3 — customer pending discount application is frozen.
 *
 * Staff/admin keep the existing authorization model on this route
 * (they were already denied). Do not invent a new staff apply privilege.
 *
 * Identity / tenant / role MUST come from the authenticated session and
 * the users row. Body fields (role, user_id, tenant_id, is_admin, is_staff)
 * are never trusted.
 */
export default defineEventHandler(async (event) => {
  try {
    await readBody(event).catch(() => undefined)

    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const role = String(userProfile.role || '')
    if (role === 'client' || role === 'customer') {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    throw createError({ statusCode: 403, statusMessage: 'Nur Kunden können Rabattcodes anwenden' })
  } catch (err: any) {
    logger.error('❌ Error in POST /api/appointments/apply-discount:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Fehler beim Anwenden des Rabatts'
    })
  }
})
