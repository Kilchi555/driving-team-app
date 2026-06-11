import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event)

    const rateLimitKey = `room_delete:${profile.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const body = await readBody(event)
    const { roomId } = body

    if (!roomId) throw createError({ statusCode: 400, statusMessage: 'Missing roomId' })

    const supabase = getSupabaseAdmin()

    // Verify the room belongs to this tenant before deleting
    const { data: existing, error: fetchErr } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchErr || !existing) {
      throw createError({ statusCode: 404, statusMessage: 'Room not found or access denied' })
    }

    // Cancel all future room_bookings for this room
    await supabase
      .from('room_bookings')
      .update({ status: 'cancelled' })
      .eq('room_id', roomId)
      .eq('tenant_id', profile.tenant_id)
      .neq('status', 'cancelled')

    // Soft-delete: mark as inactive instead of hard delete
    const { error: err } = await supabase
      .from('rooms')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .eq('tenant_id', profile.tenant_id)

    if (err) throw err

    logger.debug('✅ Room deactivated:', roomId)
    return { success: true, data: null, error: null }
  } catch (error: any) {
    logger.error('❌ Error deleting room:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})
