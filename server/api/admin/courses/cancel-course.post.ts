import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/cancel-course
 * Cancels a course, all its confirmed registrations, and optionally inserts notification records.
 *
 * Body:
 *   courseId         – id of the course to cancel
 *   notifyByEmail    – boolean
 *   notifyBySMS      – boolean
 *   participants     – array of { user_id } for notification rows
 *   courseName       – name shown in notifications
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseId, notifyByEmail, notifyBySMS, participants, courseName } = body as {
    courseId: string
    notifyByEmail?: boolean
    notifyBySMS?: boolean
    participants?: Array<{ user_id: string }>
    courseName?: string
  }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Verify course belongs to tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  // Update course status to cancelled
  const { error: courseError } = await supabase
    .from('courses')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: profile.id,
      status_changed_at: now,
      status_changed_by: profile.id,
    })
    .eq('id', courseId)

  if (courseError) {
    logger.error('❌ Error cancelling course:', courseError)
    throw createError({ statusCode: 500, statusMessage: courseError.message })
  }

  // Cancel all confirmed registrations
  const { error: regError } = await supabase
    .from('course_registrations')
    .update({ status: 'cancelled', cancelled_at: now })
    .eq('course_id', courseId)
    .eq('status', 'confirmed')

  if (regError) {
    logger.error('❌ Error cancelling registrations:', regError)
    throw createError({ statusCode: 500, statusMessage: regError.message })
  }

  // Send notifications if requested
  if ((notifyByEmail || notifyBySMS) && participants && participants.length > 0) {
    const name = courseName || course.name || 'Kurs'
    const notifications = participants.map((p) => ({
      course_id: courseId,
      user_id: p.user_id,
      notification_type: 'course_cancelled',
      title: `Kurs abgesagt: ${name}`,
      message: `Der Kurs "${name}" wurde leider abgesagt.`,
      send_email: notifyByEmail ?? false,
      send_sms: notifyBySMS ?? false,
      sent_at: now,
      created_by: profile.id,
    }))

    const { error: notifError } = await supabase
      .from('course_notifications')
      .insert(notifications)

    if (notifError) {
      // Non-fatal: log but don't fail
      logger.error('⚠️ Error inserting notifications:', notifError)
    } else {
      logger.debug(`✅ Inserted ${notifications.length} cancellation notifications`)
    }
  }

  logger.debug('✅ Course cancelled:', courseId)
  return { success: true }
})
