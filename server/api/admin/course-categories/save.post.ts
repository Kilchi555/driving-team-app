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

    const rateLimitKey = `category_save:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const body = await readBody(event)
    const { categoryId, name, description } = body

    if (!name) throw createError({ statusCode: 400, statusMessage: 'Missing name' })

    const supabase = getSupabaseAdmin()

    let result
    if (categoryId) {
      const { data, error: err } = await supabase
        .from('course_categories')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', categoryId)
        .select()
        .single()
      if (err) throw err
      result = data
    } else {
      const { data, error: err } = await supabase
        .from('course_categories')
        .insert({ tenant_id: tenantId, name, description })
        .select()
        .single()
      if (err) throw err
      result = data
    }

    logger.debug('✅ Category saved:', result.id)
    return { success: true, data: result, error: null }
  } catch (error: any) {
    logger.error('❌ Error saving category:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

