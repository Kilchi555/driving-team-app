/**
 * GET /api/courses/waitlist-info?course_id=uuid
 *
 * Public endpoint — returns minimal course info for a waitlist-mode course.
 */

import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { course_id } = getQuery(event)

  if (!course_id) {
    throw createError({ statusCode: 400, statusMessage: 'course_id ist erforderlich' })
  }

  const supabase = getSupabaseAdmin()

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, name, description, status, max_participants, price_per_participant_rappen, is_public')
    .eq('id', course_id as string)
    .eq('is_public', true)
    .eq('status', 'waitlist')
    .single()

  if (error || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden oder kein Wartelisten-Kurs' })
  }

  // Current waitlist count
  const { count } = await supabase
    .from('course_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course_id as string)
    .in('status', ['waiting', 'offered'])

  return {
    success: true,
    course: {
      ...course,
      waitlist_count: count || 0
    }
  }
})
