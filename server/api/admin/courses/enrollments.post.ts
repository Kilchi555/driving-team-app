import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!['admin', 'staff'].includes(user.role || '')) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const rateLimitKey = `courses_enrollments:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { courseId } = body

    if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

    const supabase = getSupabaseAdmin()

    const { data: enrollments, error: err } = await supabase
      .from('course_registrations')
      .select('*')
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (err) throw err

    logger.debug('✅ Course enrollments loaded:', enrollments?.length || 0)
    return { success: true, data: enrollments || [], error: null }
  } catch (error: any) {
    logger.error('❌ Error loading enrollments:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

