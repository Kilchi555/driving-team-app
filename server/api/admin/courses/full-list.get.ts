import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/courses/full-list
 * Returns all active courses for the tenant with full related data (sessions, registrations, etc.)
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:users!courses_instructor_id_fkey(first_name, last_name),
      room:rooms(name, location, capacity),
      vehicle:vehicles(name, location),
      course_category:course_categories(name, icon, color, allow_partial_enrollment, partial_start_position, partial_price_rappen),
      sessions:course_sessions(
        id,
        session_number,
        start_time,
        end_time,
        instructor_type,
        staff_id,
        external_instructor_name,
        external_instructor_email,
        external_instructor_phone,
        allow_individual_booking,
        individual_price_rappen,
        staff:users!staff_id(id, first_name, last_name)
      ),
      registrations:course_registrations(id, status, deleted_at),
      waitlist:course_waitlist(id)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)

  if (error) {
    logger.error('❌ Error loading full courses list:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data || []
})
