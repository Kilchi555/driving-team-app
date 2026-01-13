import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!['admin'].includes(user.role || '')) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const rateLimitKey = `category_delete:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { categoryId } = body

    if (!categoryId) throw createError({ statusCode: 400, statusMessage: 'Missing categoryId' })

    const supabase = getSupabaseAdmin()

    const { error: err } = await supabase
      .from('course_categories')
      .delete()
      .eq('id', categoryId)

    if (err) throw err

    logger.debug('✅ Category deleted:', categoryId)
    return { success: true, data: null, error: null }
  } catch (error: any) {
    logger.error('❌ Error deleting category:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

