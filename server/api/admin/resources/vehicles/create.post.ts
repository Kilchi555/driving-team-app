import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event)

    const rateLimitKey = `vehicle_create:${profile.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { marke, modell, location, description, requires_reservation, getriebe, aufbau, farbe } = body

    const supabase = getSupabaseAdmin()

    const { data: vehicle, error: err } = await supabase
      .from('vehicles')
      .insert({
        tenant_id: profile.tenant_id,
        marke: marke || null,
        modell: modell || null,
        location: location || null,
        description: description || null,
        requires_reservation: requires_reservation ?? true,
        getriebe: getriebe || null,
        aufbau: aufbau || null,
        farbe: farbe || null,
        is_active: true,
        created_by: profile.id,
      })
      .select()
      .single()

    if (err) throw err

    logger.debug('✅ Vehicle created:', vehicle.id)
    return { success: true, data: vehicle, error: null }
  } catch (error: any) {
    logger.error('❌ Error creating vehicle:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})
