import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event)

    const rateLimitKey = `vehicle_update:${profile.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { vehicleId, marke, modell, location, description, requires_reservation, getriebe, aufbau, farbe } = body

    if (!vehicleId) throw createError({ statusCode: 400, statusMessage: 'Missing vehicleId' })

    const supabase = getSupabaseAdmin()

    const { data: vehicle, error: err } = await supabase
      .from('vehicles')
      .update({
        marke: marke || null,
        modell: modell || null,
        location: location || null,
        description: description || null,
        requires_reservation: requires_reservation ?? true,
        getriebe: getriebe || null,
        aufbau: aufbau || null,
        farbe: farbe || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId)
      .eq('tenant_id', profile.tenant_id)
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
