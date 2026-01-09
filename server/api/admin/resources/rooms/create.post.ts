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

    const rateLimitKey = `room_create:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const body = await readBody(event)
    const { name, location, capacity, equipment } = body

    if (!name) throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })

    const supabase = getSupabaseAdmin()

    const { data: room, error: err } = await supabase
      .from('rooms')
      .insert({
        tenant_id: tenantId,
        name,
        location,
        capacity,
        equipment,
        is_active: true
      })
      .select()
      .single()

    if (err) throw err

    logger.debug('✅ Room created:', room.id)
    return { success: true, data: room, error: null }
  } catch (error: any) {
    logger.error('❌ Error creating room:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

