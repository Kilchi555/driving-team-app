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

    const rateLimitKey = `courses_create:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const body = await readBody(event)
    const { course_name, description, category, start_date, end_date, max_participants, status } = body

    if (!course_name || !start_date) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
    }

    const supabase = getSupabaseAdmin()

    const { data: course, error: err } = await supabase
      .from('courses')
      .insert({
        tenant_id: tenantId,
        course_name,
        description,
        category,
        start_date,
        end_date,
        max_participants,
        status: status || 'active',
        created_by: user.id
      })
      .select()
      .single()

    if (err) throw err

    logger.debug('✅ Course created:', course.id)
    return { success: true, data: course, error: null }
  } catch (error: any) {
    logger.error('❌ Error creating course:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

