/**
 * POST /api/admin/booking-settings
 * Saves the tenant's online booking configuration.
 * Body: {
 *   minimum_booking_lead_time_hours: number,
 *   appointment_edit_lock_mode?: 'immediately' | 'after_hours' | 'never',
 *   appointment_edit_lock_hours?: number
 * }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedAdmin } from './booking-settings.get'

const VALID_EDIT_LOCK_MODES = ['immediately', 'after_hours', 'never']

export default defineEventHandler(async (event) => {
  const auth = await getAuthenticatedAdmin(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const leadTimeHours = parseInt(body.minimum_booking_lead_time_hours)

  if (isNaN(leadTimeHours) || leadTimeHours < 0 || leadTimeHours > 168) {
    throw createError({
      statusCode: 400,
      statusMessage: 'minimum_booking_lead_time_hours must be between 0 and 168 (0–7 days)',
    })
  }

  const editLockMode = body.appointment_edit_lock_mode ?? 'immediately'
  if (!VALID_EDIT_LOCK_MODES.includes(editLockMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: `appointment_edit_lock_mode must be one of: ${VALID_EDIT_LOCK_MODES.join(', ')}`,
    })
  }

  const editLockHours = parseInt(body.appointment_edit_lock_hours ?? 0)
  if (isNaN(editLockHours) || editLockHours < 0 || editLockHours > 8760) {
    throw createError({
      statusCode: 400,
      statusMessage: 'appointment_edit_lock_hours must be between 0 and 8760 (0–365 days)',
    })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('tenants')
    .update({
      minimum_booking_lead_time_hours: leadTimeHours,
      appointment_edit_lock_mode: editLockMode,
      appointment_edit_lock_hours: editLockHours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auth.tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    success: true,
    minimum_booking_lead_time_hours: leadTimeHours,
    appointment_edit_lock_mode: editLockMode,
    appointment_edit_lock_hours: editLockHours,
  }
})
