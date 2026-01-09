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

    const rateLimitKey = `vehicle_update:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { vehicleId, name, license_plate, type, capacity, is_active } = body

    if (!vehicleId) throw createError({ statusCode: 400, statusMessage: 'Missing vehicleId' })

    const supabase = getSupabaseAdmin()

    const { data: vehicle, error: err } = await supabase
      .from('vehicles')
      .update({ name, license_plate, type, capacity, is_active })
      .eq('id', vehicleId)
      .select()
      .single()

    if (err) throw err

    logger.debug('✅ Vehicle updated:', vehicleId)
    return { success: true, data: vehicle, error: null }
  } catch (error: any) {
    logger.error('❌ Error updating vehicle:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

