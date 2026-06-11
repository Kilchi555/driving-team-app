import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/upsert
 * Creates or updates a course together with its sessions in one atomic sequence.
 * If the course requires a room, room_bookings are created for each session
 * after a conflict check.
 *
 * Body:
 *   courseData   – object with all course columns
 *   sessions     – array of session objects
 *   courseId     – (optional) id of the course to update; omit to create
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseData, sessions, courseId } = body as {
    courseData: Record<string, any>
    sessions: any[]
    courseId?: string
  }

  if (!courseData) throw createError({ statusCode: 400, statusMessage: 'Missing courseData' })

  const supabase = getSupabaseAdmin()

  // Always scope to tenant
  const payload = {
    ...courseData,
    tenant_id: profile.tenant_id,
  }

  let savedCourseId: string

  if (courseId) {
    // Update
    const { data, error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', courseId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      logger.error('❌ Error updating course:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    savedCourseId = data.id
    logger.debug('✅ Course updated:', savedCourseId)
  } else {
    // Insert
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...payload, created_by: profile.id })
      .select()
      .single()

    if (error) {
      logger.error('❌ Error creating course:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    savedCourseId = data.id
    logger.debug('✅ Course created:', savedCourseId)
  }

  // Handle sessions
  if (sessions && sessions.length > 0) {
    if (courseId) {
      // Delete existing sessions before re-creating
      const { error: delError } = await supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', savedCourseId)

      if (delError) {
        logger.error('❌ Error deleting old sessions:', delError)
        throw createError({ statusCode: 500, statusMessage: delError.message })
      }
    }

    const sessionRows = sessions.map((session: any, index: number) => ({
      course_id: savedCourseId,
      session_number: index + 1,
      start_time: `${session.date}T${session.start_time}:00`,
      end_time: `${session.date}T${session.end_time}:00`,
      description: session.description || `Session ${index + 1}`,
      instructor_type: session.instructor_type,
      staff_id: session.instructor_type === 'internal' ? session.staff_id : null,
      external_instructor_name: session.instructor_type === 'external' ? session.external_instructor_name : null,
      external_instructor_email: session.instructor_type === 'external' ? session.external_instructor_email : null,
      external_instructor_phone: session.instructor_type === 'external' ? session.external_instructor_phone : null,
      tenant_id: profile.tenant_id,
    }))

    const { error: sessError } = await supabase
      .from('course_sessions')
      .insert(sessionRows)

    if (sessError) {
      logger.error('❌ Error creating sessions:', sessError)
      throw createError({ statusCode: 500, statusMessage: sessError.message })
    }

    logger.debug(`✅ ${sessions.length} sessions saved for course ${savedCourseId}`)
  }

  // Handle room bookings
  const roomId: string | null = courseData.room_id || null
  const requiresRoom: boolean = !!courseData.requires_room

  if (requiresRoom && roomId && sessions && sessions.length > 0) {
    // Build time slots for all sessions
    const timeSlots = sessions.map((session: any) => ({
      start_time: `${session.date}T${session.start_time}:00`,
      end_time: `${session.date}T${session.end_time}:00`,
    }))

    // Cancel existing room bookings for this course (on update)
    if (courseId) {
      await supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('course_id', savedCourseId)
        .neq('status', 'cancelled')
    }

    // Conflict check: are any of the slots already booked for this room?
    const conflicts: string[] = []
    for (const slot of timeSlots) {
      const { data: existing } = await supabase
        .from('room_bookings')
        .select('id, start_time, end_time, course_id')
        .eq('room_id', roomId)
        .neq('status', 'cancelled')
        .neq('course_id', savedCourseId) // exclude own bookings
        .lt('start_time', slot.end_time)
        .gt('end_time', slot.start_time)

      if (existing && existing.length > 0) {
        conflicts.push(slot.start_time)
      }
    }

    if (conflicts.length > 0) {
      const conflictDates = conflicts
        .map(dt => new Date(dt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
        .join(', ')
      logger.warn(`⚠️ Room conflict detected for room ${roomId}:`, conflicts)
      throw createError({
        statusCode: 409,
        statusMessage: `Raumkonflikt: Der Raum ist bereits zu folgenden Zeiten gebucht: ${conflictDates}`
      })
    }

    // Create room_bookings for each session
    const bookingRows = timeSlots.map((slot) => ({
      room_id: roomId,
      tenant_id: profile.tenant_id,
      course_id: savedCourseId,
      start_time: slot.start_time,
      end_time: slot.end_time,
      purpose: 'course',
      booked_by: profile.id,
      status: 'confirmed',
    }))

    const { error: bookingError } = await supabase
      .from('room_bookings')
      .insert(bookingRows)

    if (bookingError) {
      logger.error('❌ Error creating room_bookings:', bookingError)
      // Non-fatal: course is saved, just log the issue
      logger.warn('⚠️ Course saved but room bookings could not be created')
    } else {
      logger.debug(`✅ ${bookingRows.length} room bookings created for course ${savedCourseId}`)
    }
  } else if (courseId && (!requiresRoom || !roomId)) {
    // Room was removed from an existing course — cancel its bookings
    await supabase
      .from('room_bookings')
      .update({ status: 'cancelled' })
      .eq('course_id', savedCourseId)
      .neq('status', 'cancelled')
  }

  return { id: savedCourseId }
})
