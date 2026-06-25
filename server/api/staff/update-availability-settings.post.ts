/**
 * POST /api/staff/update-availability-settings
 * Upserts availability settings for the authenticated staff member.
 *
 * Body (all fields optional):
 *   { buffer_minutes?: number, home_plz?: string }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { buffer_minutes, home_plz } = body

  // Validate buffer_minutes
  if (buffer_minutes !== undefined) {
    const parsed = parseInt(buffer_minutes)
    if (isNaN(parsed) || parsed < 0 || parsed > 120) {
      throw createError({
        statusCode: 400,
        statusMessage: 'buffer_minutes must be between 0 and 120'
      })
    }
  }

  const supabase = getSupabaseAdmin()

  const { data: userProfile, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (userErr || !userProfile) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (buffer_minutes !== undefined) updates.buffer_minutes = parseInt(buffer_minutes)
  if (home_plz !== undefined) updates.home_plz = home_plz?.trim() || null

  const { error } = await supabase
    .from('staff_availability_settings')
    .upsert(
      { staff_id: userProfile.id, ...updates },
      { onConflict: 'staff_id' }
    )

  if (error) {
    logger.error('❌ Error upserting availability settings:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Queue slot recalculation so the new buffer takes effect immediately
  await $fetch('/api/availability/queue-recalc', {
    method: 'POST',
    body: { staff_id: userProfile.id, trigger: 'settings_change' }
  }).catch((e: any) => {
    logger.warn('⚠️ Could not queue recalc after settings update (non-critical):', e.message)
  })

  logger.debug('✅ Availability settings updated for staff', userProfile.id)
  return { success: true, updates }
})
