import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/enroll-user
 * Enrols an existing user (by userId) in a course.
 *
 * Body:
 *   courseId – id of the course
 *   userId   – id of the user to enrol
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { courseId, userId } = await readBody(event) as { courseId: string; userId: string }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Missing userId' })

  const supabase = getSupabaseAdmin()

  // Verify course belongs to tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  // Load user info (must belong to same tenant)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone')
    .eq('id', userId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (userError || !user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Create enrollment
  const { error: enrollError } = await supabase
    .from('course_registrations')
    .insert({
      course_id: courseId,
      user_id: userId,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      status: 'confirmed',
      registered_at: new Date().toISOString(),
      tenant_id: profile.tenant_id,
      registered_by: profile.id,
    })

  if (enrollError) {
    logger.error('❌ Error creating enrollment:', enrollError)
    throw createError({ statusCode: 500, statusMessage: `Anmeldung konnte nicht erstellt werden: ${enrollError.message}` })
  }

  logger.debug('✅ User enrolled:', userId)
  return { success: true }
})
