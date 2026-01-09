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

    const rateLimitKey = `room_update:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { roomId, name, location, capacity, equipment, is_active } = body

    if (!roomId) throw createError({ statusCode: 400, statusMessage: 'Missing roomId' })

    const supabase = getSupabaseAdmin()

    const { data: room, error: err } = await supabase
      .from('rooms')
      .update({ name, location, capacity, equipment, is_active })
      .eq('id', roomId)
      .select()
      .single()

    if (err) throw err

    logger.debug('✅ Room updated:', roomId)
    return { success: true, data: room, error: null }
  } catch (error: any) {
    logger.error('❌ Error updating room:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

