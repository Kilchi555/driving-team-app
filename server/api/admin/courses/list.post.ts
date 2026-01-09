import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const user = await getAuthUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Check admin role
    if (!['admin', 'staff'].includes(user.role || '')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' })
    }

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitKey = `courses_list:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000) // 30 requests per minute
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    const tenantId = user.tenant_id
    if (!tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'User has no tenant assigned' })
    }

    const supabase = getSupabaseAdmin()

    logger.debug('📚 Loading courses list for tenant:', tenantId)

    // ============ Load courses ============
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        course_name,
        description,
        category,
        start_date,
        end_date,
        max_participants,
        status,
        created_at,
        created_by
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (coursesError) {
      logger.error('❌ Error loading courses:', coursesError)
      throw coursesError
    }

    logger.debug('✅ Courses loaded:', courses?.length || 0)

    return {
      success: true,
      data: courses || [],
      error: null
    }
  } catch (error: any) {
    logger.error('❌ Error in courses/list:', error)
    return {
      success: false,
      data: null,
      error: error.statusMessage || 'Failed to load courses'
    }
  }
})

