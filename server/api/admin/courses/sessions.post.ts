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

    const rateLimitKey = `courses_sessions:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { courseId } = body

    if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

    const supabase = getSupabaseAdmin()

    const { data: sessions, error: err } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('start_date', { ascending: true })

    if (err) throw err

    logger.debug('✅ Course sessions loaded:', sessions?.length || 0)
    return { success: true, data: sessions || [], error: null }
  } catch (error: any) {
    logger.error('❌ Error loading course sessions:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

