/**
 * GET /api/staff/get-availability-settings
 * Returns buffer_minutes, home_plz and other availability settings for the
 * authenticated staff member (from staff_availability_settings).
 */

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: userProfile, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (userErr || !userProfile) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }

  const { data, error } = await supabase
    .from('staff_availability_settings')
    .select('buffer_minutes, home_plz, minimum_booking_lead_time_hours, availability_mode, pickup_radius_minutes')
    .eq('staff_id', userProfile.id)
    .maybeSingle()

  if (error) {
    logger.error('❌ Error loading availability settings:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    success: true,
    settings: {
      buffer_minutes: data?.buffer_minutes ?? 15,
      home_plz: data?.home_plz ?? null,
      minimum_booking_lead_time_hours: data?.minimum_booking_lead_time_hours ?? 24,
      availability_mode: data?.availability_mode ?? 'standard',
      pickup_radius_minutes: data?.pickup_radius_minutes ?? 10,
    }
  }
})
