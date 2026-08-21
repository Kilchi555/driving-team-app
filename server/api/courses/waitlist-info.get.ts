/**
 * GET /api/courses/waitlist-info?course_id=uuid
 *
 * Public endpoint — returns minimal course info for a course that accepts
 * waitlist entries. That's either a dedicated waitlist placeholder
 * (status='waitlist') or a regular course that is fully booked
 * (status active/scheduled with 0 free slots).
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
    .select('id, name, description, status, max_participants, current_participants, price_per_participant_rappen, is_public')
    .eq('id', course_id as string)
    .eq('is_public', true)
    .in('status', ['waitlist', 'active', 'scheduled'])
    .single()

  if (error || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden oder kein Wartelisten-Kurs' })
  }

  const isWaitlistMode = course.status === 'waitlist'
  const freeSlots = (course.max_participants ?? 0) - (course.current_participants ?? 0)
  const isFullCourse = !isWaitlistMode && freeSlots <= 0

  if (!isWaitlistMode && !isFullCourse) {
    throw createError({ statusCode: 409, statusMessage: 'Dieser Kurs nimmt keine Wartelisten-Einträge an' })
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
