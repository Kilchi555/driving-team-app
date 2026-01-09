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

    const rateLimitKey = `general_resource_save:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const body = await readBody(event)
    const { resourceId, name, type, availability } = body

    if (!name || !type) throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })

    const supabase = getSupabaseAdmin()

    let result
    if (resourceId) {
      const { data, error: err } = await supabase
        .from('general_resources')
        .update({ name, type, availability })
        .eq('id', resourceId)
        .select()
        .single()
      if (err) throw err
      result = data
    } else {
      const { data, error: err } = await supabase
        .from('general_resources')
        .insert({ tenant_id: tenantId, name, type, availability })
        .select()
        .single()
      if (err) throw err
      result = data
    }

    logger.debug('✅ General resource saved:', result.id)
    return { success: true, data: result, error: null }
  } catch (error: any) {
    logger.error('❌ Error saving general resource:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

