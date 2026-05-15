import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/upsert
 * Creates or updates a course together with its sessions in one atomic sequence.
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

  return { id: savedCourseId }
})
