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

    const rateLimitKey = `vehicle_delete:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { vehicleId } = body

    if (!vehicleId) throw createError({ statusCode: 400, statusMessage: 'Missing vehicleId' })

    const supabase = getSupabaseAdmin()

    const { error: err } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)

    if (err) throw err

    logger.debug('✅ Vehicle deleted:', vehicleId)
    return { success: true, data: null, error: null }
  } catch (error: any) {
    logger.error('❌ Error deleting vehicle:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

