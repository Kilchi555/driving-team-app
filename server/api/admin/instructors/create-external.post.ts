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

    const rateLimitKey = `instructor_create:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const body = await readBody(event)
    const { name, email, phone, specialization } = body

    if (!name || !email) throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })

    const supabase = getSupabaseAdmin()

    const { data: instructor, error: err } = await supabase
      .from('external_instructors')
      .insert({
        tenant_id: tenantId,
        name,
        email,
        phone,
        specialization,
        is_active: true
      })
      .select()
      .single()

    if (err) throw err

    logger.debug('✅ External instructor created:', instructor.id)
    return { success: true, data: instructor, error: null }
  } catch (error: any) {
    logger.error('❌ Error creating external instructor:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

