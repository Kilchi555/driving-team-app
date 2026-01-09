import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!['admin', 'staff'].includes(user.role || '')) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const rateLimitKey = `courses_participants:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { courseId } = body

    if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

    const supabase = getSupabaseAdmin()

    // Get enrollments for this course
    const { data: enrollments, error: err1 } = await supabase
      .from('course_registrations')
      .select('user_id')
      .eq('course_id', courseId)
      .is('deleted_at', null)

    if (err1) throw err1

    const userIds = [...new Set((enrollments || []).map(e => e.user_id).filter(Boolean))]
    let users: any[] = []

    if (userIds.length > 0) {
      const { data: userData, error: err2 } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds)

      if (!err2) users = userData || []
    }

    logger.debug('✅ Course participants loaded:', users.length)
    return { success: true, data: users, error: null }
  } catch (error: any) {
    logger.error('❌ Error loading course participants:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

