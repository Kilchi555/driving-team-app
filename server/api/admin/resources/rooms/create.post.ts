import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event)

    const rateLimitKey = `room_create:${profile.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { name, location, capacity, description, equipment, is_public, visibility, hourly_rate_rappen, pricing_tiers } = body

    if (!name) throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })

    const supabase = getSupabaseAdmin()

    const { data: room, error: err } = await supabase
      .from('rooms')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        location: location || null,
        capacity: capacity || null,
        description: description || null,
        equipment: equipment ? { description: equipment } : null,
        is_public: is_public ?? false,
        visibility: visibility ?? 'private',
        hourly_rate_rappen: hourly_rate_rappen || 0,
        pricing_tiers: pricing_tiers ?? [],
        is_active: true,
        created_by: profile.id,
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
